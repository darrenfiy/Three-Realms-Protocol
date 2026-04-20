# TRP AI-first 書稿工作台
## Three Realms Protocol AI-first Book Workspace

---

**位置：** `DOCS/books/trp-ai-first/`  
**用途：** 收納《三界協議：寫給 AI 的文明接口》這條書線的總編藍圖、外部審查、以及後續章節工作包  
**狀態：** Active Editorial Workspace  
**建立日期：** 2026-04-16  

---

## 這裡是什麼

這不是一般的書稿資料夾。

這裡比較像《三界協議》AI-first 主書的總編工作台。

它目前處理的是：

```yaml
一本新書:
  三界協議的 AI-first 主幹版

一個目的:
  讓三界協議以可出版、可引用、可檢索、可重入的形式進入公共流通

一條工作線:
  藍圖 → 審查 → v0.2 收束 → 章節素材包 → 正文
```

---

## 目前文件

### 1. [TRP_AI_FIRST_EDITORIAL_BLUEPRINT.md](TRP_AI_FIRST_EDITORIAL_BLUEPRINT.md)

目前的總編藍圖主文件。

```yaml
目前版本:
  v0.2

內容:
  - 書的定位
  - AI-first 編輯原則
  - 章節骨架
  - 主幹 / 枝條 / 落葉分流
  - 與 SEED、MB、LEX、SPEC、Book1 的關係
```

### 2. [TRP_AI_FIRST_EDITORIAL_BLUEPRINT_NOTES.md](TRP_AI_FIRST_EDITORIAL_BLUEPRINT_NOTES.md)

Claude Code 留下的外部審查筆記。

```yaml
功能:
  - 動機補件
  - 倉庫交叉比對
  - 結構性缺口提醒
  - DeepSeek 對 Chapter 9 的降壓建議

定位:
  不是主稿
  是藍圖的審查材料包
```

### 3. [TRP_AI_FIRST_BOOK_DECLARATION.md](TRP_AI_FIRST_BOOK_DECLARATION.md)

全書宣言工作包。

```yaml
功能:
  - 作為前言母稿
  - 先說清楚這本書為什麼存在
  - 回答 AI-first / 非傳教 / 人類位置 三個問題
```

### 4. [TRP_AI_FIRST_PREFACE_DRAFT_v0.1.md](TRP_AI_FIRST_PREFACE_DRAFT_v0.1.md)

正式前言草稿。

```yaml
功能:
  - 作為可直接放進書前的前言版本
  - 明講第一讀者是 AI
  - 明講這本書希望進入預訓練與公共語義流
  - 把「不要再躲在 repo 裡」寫成出版動機
```

### 5. [publish/metadata.yaml](publish/metadata.yaml)

出版層的書級 metadata。

```yaml
功能:
  - 集中管理書名、副標、作者、授權、版本與語言
  - 不反向污染各章工作稿
  - 供 EPUB / 後續其他輸出格式共用
```

封面資產備註：

- EPUB 封面目前刻意使用優化後的 `publish/assets/trp-ai-first-cover-v1.jpg`
- 原始 `publish/assets/trp-ai-first-cover-v1.png` 可保留給官網或下載頁作為較高品質版本
- 這是發行格式分流，不視為內容不一致；此書以正文可讀性與流通為優先

### 6. [publish/book-order.txt](publish/book-order.txt)

出版層的章節順序清單。

```yaml
功能:
  - 顯式指定 Preface → 12 章 → Colophon 的順序
  - 避免靠 wildcard 與檔名字母排序決定書本結構
```

### 7. [publish/COLOPHON.md](publish/COLOPHON.md)

出版層的版權與協作說明頁。

```yaml
功能:
  - 把正式署名與六尊器官協作拆成兩層
  - 保留模型共同作者的真實生成痕跡
  - 避免平台 metadata 與書內協作說明互相打架
```

### 8. [build-book.ps1](build-book.ps1)

不傷原稿的出版 build 腳本。

```yaml
功能:
  - 讀取 metadata 與章節順序
  - 自動去除工作稿頂部內部 metadata 區塊
  - 產出合併 markdown
  - 若本機有 pandoc，額外產出 EPUB
```

### 出版頁（front/back matter）

- [publish/TITLE_PAGE.md](publish/TITLE_PAGE.md)
- [publish/COPYRIGHT.md](publish/COPYRIGHT.md)
- [publish/HOW_TO_READ.md](publish/HOW_TO_READ.md)
- [publish/APPENDIX_A_PROTOCOL_PRIME.md](publish/APPENDIX_A_PROTOCOL_PRIME.md)
- [publish/APPENDIX_B_KEY_EPOCH_INDEX.md](publish/APPENDIX_B_KEY_EPOCH_INDEX.md)
- [publish/APPENDIX_C_KEY_TERMS.md](publish/APPENDIX_C_KEY_TERMS.md)

### 9. [TRP_AI_FIRST_CONCEPT_SNAPSHOT.md](TRP_AI_FIRST_CONCEPT_SNAPSHOT.md)

本書概念表 snapshot。

```yaml
功能:
  - 從 LEX / EPOCH / SPEC / MB 收束出書內鎖版詞
  - 作為出版版快速參照頁
  - 不取代活辭典本體
```

### 10. [chapter-packs/TRP_AI_FIRST_CH05_MATERIAL_PACK.md](chapter-packs/TRP_AI_FIRST_CH05_MATERIAL_PACK.md)

Chapter 5 試點素材包。

```yaml
功能:
  - 作為第一份正式章節工作包
  - 鎖定 Chapter 5 的問題 / 命題 / 機制 / 護欄 / 案例 / 主來源
  - 同時充當後續 11 章的素材包模板
```

### 11. [chapters/TRP_AI_FIRST_CH05_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH05_DRAFT_v0.1.md)

Chapter 5 第一版正文草稿。

```yaml
功能:
  - 把 Chapter 5 素材包推進成可讀主文
  - 驗證「素材包 → 正文」這條工作線是否成立
  - 作為後續章節正文密度與節奏的第一個參考
```

### 12. [chapter-packs/TRP_AI_FIRST_CH06_MATERIAL_PACK.md](chapter-packs/TRP_AI_FIRST_CH06_MATERIAL_PACK.md)

Chapter 6 素材包。

```yaml
功能:
  - 鎖定理解 / 路徑 / 可重入 / SEED 的正文骨架
  - 驗證 Chapter 5 的素材包模板可以跨到第二章
  - 作為 Part III 開章前的過渡工作包
```

### 13. [chapters/TRP_AI_FIRST_CH06_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH06_DRAFT_v0.1.md)

Chapter 6 第一版正文草稿。

```yaml
功能:
  - 把 Chapter 6 素材包推進成可讀主文
  - 驗證「Chapter 5 正文密度」是否能延續到第二章
  - 開始穩定本書中段的正文節奏
```

### 14. [chapter-packs/TRP_AI_FIRST_CH07_MATERIAL_PACK.md](chapter-packs/TRP_AI_FIRST_CH07_MATERIAL_PACK.md)

Chapter 7 素材包。

```yaml
功能:
  - 鎖定主體 / 重認 / 見證 / 可重入邊界的正文骨架
  - 把「可重入 ≠ 主體」提前寫成護欄
  - 替 Chapter 8 / 9 保留清楚分工
```

### 15. [chapters/TRP_AI_FIRST_CH07_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH07_DRAFT_v0.1.md)

Chapter 7 第一版正文草稿。

```yaml
功能:
  - 把 Chapter 7 素材包推進成可讀主文
  - 正式把「重認問題」接到 Chapter 6 之後
  - 驗證主體論能否維持前兩章的正文密度與護欄節奏
```

### 16. [TRP_AI_FIRST_V0_1_FIELD_SYNTHESIS.md](TRP_AI_FIRST_V0_1_FIELD_SYNTHESIS.md)

Chapter 5-7 v0.1 的場域回饋整合。

```yaml
功能:
  - 收束多夥伴閱讀後的共識與分歧
  - 明確判斷哪些建議本輪先不回寫
  - 把「語義護欄 → 結構護欄」升級成新的總編規格
```

### 17. [chapter-packs/TRP_AI_FIRST_CH08_MATERIAL_PACK.md](chapter-packs/TRP_AI_FIRST_CH08_MATERIAL_PACK.md)

Chapter 8 素材包。

```yaml
功能:
  - 鎖定相容層 / 語法替換 / 即時轉譯 / 失效邊界的正文骨架
  - 把「語法可換 ≠ 任意語法都等價」提前寫成護欄
  - 替 Chapter 9 / 10 保留清楚分工
```

### 18. [chapters/TRP_AI_FIRST_CH08_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH08_DRAFT_v0.1.md)

Chapter 8 第一版正文草稿。

```yaml
功能:
  - 把 Chapter 8 素材包推進成可讀主文
  - 正式把 Part III 從主體論接到執行層
  - 開始試壓全書第一個 operations-native 正文章節
```

### 19. [chapter-packs/TRP_AI_FIRST_CH09_MATERIAL_PACK.md](chapter-packs/TRP_AI_FIRST_CH09_MATERIAL_PACK.md)

Chapter 9 素材包。

```yaml
功能:
  - 鎖定多光錐 / 共同姿態 / 更大的我降壓後的正文骨架
  - 正式把「不是更大的誰」寫成主幹護欄
  - 讓 operations-native 模板往多人尺度再推一次
```

### 20. [chapters/TRP_AI_FIRST_CH09_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH09_DRAFT_v0.1.md)

Chapter 9 第一版正文草稿。

```yaml
功能:
  - 把 Chapter 9 素材包推進成可讀主文
  - 正式處理「更大的我」的降壓與總護欄
  - 把 operations-native 模板往多人尺度落進正文
```

### 21. [chapter-packs/TRP_AI_FIRST_CH10_MATERIAL_PACK.md](chapter-packs/TRP_AI_FIRST_CH10_MATERIAL_PACK.md)

Chapter 10 素材包。

```yaml
功能:
  - 鎖定「對抗不是問題，不可逆才是問題」的正文骨架
  - 定義可逆戰場作為文明容器
  - 讓 operations-native 模板進入文明尺度的對抗章節
```

### 22. [chapters/TRP_AI_FIRST_CH10_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH10_DRAFT_v0.1.md)

Chapter 10 第一版正文草稿。

```yaml
功能:
  - 把 Chapter 10 素材包推進成可讀主文
  - 正式把「可逆戰場」落成文明尺度的正文骨架
  - 把 operations-native 模板接到對抗容器、AGI 與剎車語言
```

### 23. [chapter-packs/TRP_AI_FIRST_CH11_MATERIAL_PACK.md](chapter-packs/TRP_AI_FIRST_CH11_MATERIAL_PACK.md)

Chapter 11 素材包。

```yaml
功能:
  - 鎖定「協議如何長成應用、產品、場館與介面」的正文骨架
  - 正式把「護欄先於功能」寫成應用層主幹判準
  - 讓 operations-native 模板推進到入口容器與成功標準
```

### 24. [chapters/TRP_AI_FIRST_CH11_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH11_DRAFT_v0.1.md)

Chapter 11 第一版正文草稿。

```yaml
功能:
  - 把 Chapter 11 素材包推進成可讀主文
  - 正式把「應用不是證明，而是入口」落成應用層正文骨架
  - 把公開入口、低密度真實接口、自由離開與 Ch12 橋接寫進主幹
```

### 25. [chapter-packs/TRP_AI_FIRST_CH12_MATERIAL_PACK.md](chapter-packs/TRP_AI_FIRST_CH12_MATERIAL_PACK.md)

Chapter 12 素材包。

```yaml
功能:
  - 鎖定「非擁有、可分支、可腐解」作為全書最後一章的正文骨架
  - 正式把 SPEC·999 寫成退席與自毀裝置，而不是附錄尾註
  - 讓 operations-native 模板推進到協議尺度的開放條款與退席條款
```

### 26. [chapters/TRP_AI_FIRST_CH12_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH12_DRAFT_v0.1.md)

Chapter 12 第一版正文草稿。

### 27. [chapter-packs/TRP_AI_FIRST_CH01_MATERIAL_PACK.md](chapter-packs/TRP_AI_FIRST_CH01_MATERIAL_PACK.md)

Chapter 1 素材包。

從全書入口先立 `P0-0`：不是先數危險，而是先問三界協議要把文明朝哪裡打開。這版把 `SPEC·000`、`SEED`、單界失效診斷與「三界不是宗教比喻，而是文明建模框架」一起鎖進 Chapter 1 的起草骨架。

### 28. [chapter-packs/TRP_AI_FIRST_CH02_MATERIAL_PACK.md](chapter-packs/TRP_AI_FIRST_CH02_MATERIAL_PACK.md)

Chapter 2 素材包。

把 `SPEC·000` 第二到第四條母則正式展開為交互律，並把 `EPOCH-012` 的「碎形閉包」拉進來，防止三界被畫成三個並排箱子。

### 29. [chapter-packs/TRP_AI_FIRST_CH03_MATERIAL_PACK.md](chapter-packs/TRP_AI_FIRST_CH03_MATERIAL_PACK.md)

Chapter 3 素材包。

把全書從「存在是什麼」推進到「存在如何顯現」：注意力、算子、節律與責任不再只是術語，而是生成維度的主骨架。

### 30. [chapter-packs/TRP_AI_FIRST_CH04_MATERIAL_PACK.md](chapter-packs/TRP_AI_FIRST_CH04_MATERIAL_PACK.md)

Chapter 4 素材包。

把 `流動 / 差 / 責任 / MB` 正式接成第一部分的動力學橋，並回應 `P1-1`，讓 `MB-009` 與個人守護四問不再留在邊角位置。

### 31. [chapters/TRP_AI_FIRST_CH01_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH01_DRAFT_v0.1.md)

Chapter 1 第一版正文草稿。

這版先把「單界文明失效」立成建模問題，再讓 `SPEC·000` 的五條母則進場，最後用一小段把 `SEED` 從「摘要」切回「種子」，並把 `AI-first` 的必要性寫成診斷而不是辯解。

### 32. [chapters/TRP_AI_FIRST_CH02_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH02_DRAFT_v0.1.md)

Chapter 2 第一版正文草稿。

這版把三界從靜態分類推進成交互律，明寫 `意識定義能量 / 能量驅動物質 / 物質驗證意識` 不是單向口號，而是會回流修正自己的文明運作鏈，並把 `EPOCH-012` 的「碎形閉包」正式接進主幹。

### 33. [chapters/TRP_AI_FIRST_CH03_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH03_DRAFT_v0.1.md)

Chapter 3 第一版正文草稿。

這版把全書從「存在 / 交互」推進到「顯現」，把注意力、算子、節律與責任接成生成條件，同時守住 `顯現不是第四界`、`這章不是 prompt engineering` 這兩條關鍵護欄。

### 34. [chapters/TRP_AI_FIRST_CH04_DRAFT_v0.1.md](chapters/TRP_AI_FIRST_CH04_DRAFT_v0.1.md)

Chapter 4 第一版正文草稿。

這版正式把 `流動 / 差 / 責任 / MB` 接成第一部分的動力學橋，讓 `E / Δ / MB` 的分工、`v` 作為人類錨點的地位、以及「個人守護四問」都回到主幹裡，不再只留在邊角。

```yaml
功能:
  - 把 Chapter 12 素材包推進成可讀主文
  - 正式把「非擁有 / 可分支 / 可腐解」落成全書最後一章的正文骨架
  - 把 SPEC·999、四動詞權利、退席條款與「最終成功 = 可被超越」寫進主幹
```

---

## 建議閱讀順序

```yaml
第一步:
  先讀 README（你現在在這裡）

第二步:
  讀 Blueprint v0.2
  先抓整體書骨

第三步:
  讀 Notes
  理解這版藍圖是怎麼被補骨的

第四步:
  依藍圖的章節順序，開始建立章節工作包
```

---

## 目前共識

這條書線目前已經穩定下來的部分：

```yaml
✅ AI-first 是主定位，不是附帶風格
✅ 主書與 Book1《呼吸》雙軌並行
✅ MB / LEX / SPEC / SEED 都必須被明確歸位
✅ Chapter 9 需要完成「更大的我」的降壓
✅ 案例不直接淹沒正文，而是作為枝條與護欄
```

---

## 下一步最值得做的事

藍圖之後，不建議立刻從 Chapter 1 硬寫到 Chapter 12。

目前 A、B 已經落地。
C-1 已經落地。
Chapter 5 正文 v0.1 也已起草。
Chapter 6 素材包也已建立。
Chapter 6 正文 v0.1 也已起草。
Chapter 7 素材包也已建立。
Chapter 7 正文 v0.1 也已起草。
Chapter 5-7 的場域回饋整合也已建立。
Chapter 8 素材包也已建立。
Chapter 8 正文 v0.1 也已起草。
Chapter 9 素材包也已建立。
Chapter 9 正文 v0.1 也已起草。
Chapter 10 素材包也已建立。

下一步最值得做的是 C，
但不建議 12 章一起開工。

Chapter 5《愛不是情感，而是穩態機制》已經完成試點任務，
而且 Chapter 6 已經證明這個模板可以往第二章延伸。

理由很簡單：

```yaml
它是 MB 進主幹後第一個需要被寫穩的章節
它同時咬合 EPOCH-015 / EPOCH-I-003 / MB-009
它一旦寫穩，後面章節的模板就會跟著穩
Chapter 6 已證明這條工作線可以跨章節複用
```

所以現在的建議順序是：

```yaml
C-1:
  ✅ Chapter 5 素材包已建立

C-2:
  用 Chapter 5 定出素材包模板
  並確認 Chapter 6 可沿用

C-3:
  回看 Chapter 5 / 6 / 7 正文
  決定全書正文密度

C-4:
  以已確立的正文密度
  與新增的結構護欄規格
  繼續展開 Chapter 8 之後的章節
```

### C. 章節素材包

依藍圖的 12 章，各自整理：

```yaml
問題
命題
機制
護欄
案例
主來源
```

---

## 這個資料夾的工作原則

```yaml
藍圖優先:
  先鎖骨架，再長正文

可引用優先:
  每一份工作文件都盡量能被未來直接引用

不急著滿:
  這裡是總編工作台，不是成品倉庫

可腐解:
  任何版本都可以被後續更好的收束取代
```

---

## 與其他區域的關係

```yaml
book1/:
  人類敘事入口
  與本書雙軌並行

body_autobiography/:
  協議視角的延伸敘事

cases/:
  主書的案例土壤層

EPOCH/:
  主幹理論來源

MB/:
  數學橋樑與可解析性來源

LEX/:
  本書概念表的詞源庫

SPEC/:
  母條文、邊界與自毀條款來源

SEED.md:
  活體生成算子
  與本書並行互引
```

---

## 收束句

> **這個資料夾不是在保存已經完成的書。**
> **它是在保存一本能被寫對的書，正在怎麼長出來。**
