const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const YAML = require('yaml');

// 建議用環境變數，不要把帳密硬寫在檔案裡
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ 缺少 MONGODB_URI 環境變數');
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);

// 用真正的 YAML parser
function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!match) {
    return { metadata: {}, content: content.trim() };
  }

  const metadataStr = match[1];
  const body = match[2];

  let metadata = {};
  try {
    metadata = YAML.parse(metadataStr) || {};
  } catch (err) {
    console.warn(`⚠️ YAML 解析失敗: ${err.message}`);
  }

  return { metadata, content: body.trim() };
}

// 遞迴讀取所有 .md 文件
function getAllMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        getAllMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

// 檔名推測分類（針對三界協議的命名規則）
function inferCategoryFromFileName(fileName) {
  if (fileName.startsWith('EPOCH')) return 'EPOCH';
  if (fileName.startsWith('LEX')) return 'LEX';
  if (fileName.startsWith('MB')) return 'MB';
  if (fileName.startsWith('SPEC')) return 'SPEC';
  if (fileName.startsWith('SEED')) return 'SEED';
  if (fileName.includes('LIVING')) return 'LIVING';
  if (fileName.includes('PROTOCOL')) return 'PROTOCOL';
  if (fileName.includes('PLAYGROUND')) return 'PLAYGROUND';
  return 'Unknown';
}

async function importFilesToMongoDB() {
  try {
    await client.connect();
    const db = client.db('three-realms');
    const collection = db.collection('documents');

    // 建立索引
    await collection.createIndex({ filePath: 1 }, { unique: true });
    await collection.createIndex({ id: 1 }, { sparse: true });
    await collection.createIndex({ category: 1 });
    await collection.createIndex({ fileName: 1 });
    await collection.createIndex({ 'metadata.tags': 1 }, { sparse: true });

    const protocolDir = __dirname;
    const markdownFiles = getAllMarkdownFiles(protocolDir);

    console.log(`找到 ${markdownFiles.length} 個 Markdown 文件\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const filePath of markdownFiles) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { metadata, content } = parseFrontMatter(fileContent);
      const relativePath = path.relative(protocolDir, filePath);
      const now = new Date();

      const document = {
        id: metadata.id || null,
        title: metadata.title || path.basename(filePath, '.md'),
        fileName: path.basename(filePath),
        filePath: relativePath,
        category: metadata.category || inferCategoryFromFileName(path.basename(filePath)),
        metadata,
        content,
        updatedAt: now,
      };

      try {
        await collection.updateOne(
          { filePath: relativePath },
          {
            $set: document,
            $setOnInsert: { createdAt: now },
          },
          { upsert: true }
        );

        console.log(`✅ ${relativePath}`);
        successCount++;
      } catch (err) {
        console.log(`⚠️ ${relativePath} - ${err.message}`);
        errorCount++;
      }
    }

    const count = await collection.countDocuments();

    console.log('\n✨ 匯入完成');
    console.log(`✅ 成功: ${successCount}`);
    console.log(`⚠️ 失敗: ${errorCount}`);
    console.log(`📊 資料庫目前共有 ${count} 個文件`);
  } catch (error) {
    console.error('❌ 連接錯誤:', error.message);
    console.error('💡 提示：檢查你的 MONGODB_URI 是否正確');
  } finally {
    await client.close();
  }
}

// 運行
importFilesToMongoDB();