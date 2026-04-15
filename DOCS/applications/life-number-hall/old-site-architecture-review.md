# 舊生命靈數館架構盤點
## Old Site Architecture Review

---

**盤點日期：** 2026-04-15  
**舊站位置：** `C:\Users\Administrator\Desktop\darrenfiy.github.io`  
**新館位置：** `DOCS/applications/life-number-hall/`  
**目前判斷：** 新館重建；舊站保留到歷史區，作為小工具與材料庫  

---

## 0. 先說結論

舊生命靈數館不是正式營運過的產品，而是一個早期嘗試。

因此它不需要被「維修成原樣」。

比較好的方向是：

```yaml
新館:
  重新設計
  重新決定使用者旅程
  未來再慢慢與三界協議對齊

舊站:
  不刪除
  不急著翻修
  放進歷史區
  保留成一個可回看的小工具 / 材料庫 / 舊館樣本
```

換句話說：

> **舊站不是新館的地基。**
> **舊站是新館旁邊的一間歷史工坊。**

---

## 1. 舊站一句話描述

舊站是一個純靜態 HTML / JS 生命靈數工具。

它的核心資料流大致是：

```yaml
生日輸入
  -> 生命靈數
  -> 今日能量
  -> 天賦金字塔
  -> 事業碼 / 家庭碼 / 坐鎮碼
  -> 每組碼拆成 起因 / 過程 / 結果
  -> 深度旅程解析
```

它真正值得留下的不是當時的 UI，
而是這條「從生日拆出多層數字旅程」的結構。

---

## 2. 檔案地圖

```yaml
darrenfiy.github.io/
  index.html:
    主入口
    生日輸入
    生命靈數結果
    今日能量
    天賦密碼摘要
    心情紀錄
    localStorage 保存生日、靈數、心情

  deep-reading.html:
    深度解析頁
    從 URL query 或 localStorage 取得生日
    顯示三組旅程:
      - 事業碼
      - 家庭碼
      - 坐鎮碼
    每組旅程顯示:
      - 起因
      - 過程
      - 結果
      - 旅程總結
      - 成長建議

  combo-tips.js:
    生命靈數 x 今日能量提醒
    提供 comboTips 與 energyNames

  numerology-pyramid.js:
    數字基礎定義
    生命金字塔計算核心
    calculateTalentCodes()
    getTalentInterpretation()

  number-dimensions.js:
    27 文本智慧架構
    9 個數字 x 3 個領域
    每個領域再分 asStart / asProcess / asResult

  journey-composer.js:
    智能組合器
    composeJourney()
    數字模式分析:
      - ascending
      - descending
      - peak
      - valley
      - plateau
      - wave

  archive/number-journeys.js:
    大型手工解析庫
    careerJourneys
    familyJourneys
    throneJourneys
    fallback / generated journey

  README.md:
    舊系統技術說明
    提到 27 文本智慧系統與 105 組手工內容
```

補充：

`blu-guarden.html`、`supabase-lab.html` 看起來屬於其他實驗或延伸，不應先混入生命靈數館重建主線。

---

## 3. 值得保留的結構

### 3.1 三組碼結構

舊站把生日拆成三組碼：

```yaml
事業碼:
  工作 / 創造價值 / 對外展現

家庭碼:
  關係 / 情感 / 內在連結

坐鎮碼:
  生命道路 / 核心方向
```

這個結構值得保留成「歷史小工具」的一部分。

它不一定要成為新館的核心模型，
但它很適合做成一個可選入口：

> **想看看舊館怎麼讀生日的人，可以進歷史區玩。**

### 3.2 起因 / 過程 / 結果

每組碼都拆成三段：

```yaml
起因:
  能量從哪裡開始

過程:
  中途如何轉化

結果:
  最後如何展現
```

這比單純顯示「你是幾號」更有動態感。

這個三段旅程結構很值得留，因為它天生比較接近「過程」而不是「身份」。

### 3.3 27 文本智慧架構

舊站 README 將系統描述為：

```yaml
9 個數字 x 3 個領域 x 3 個位置 = 27 個核心定義
```

這是非常值得留下的架構。

原因不是它一定準確，
而是它降低了維護成本：

```yaml
不需要:
  為 243 種組合各寫一篇完整解析

而是:
  維護少量核心語義
  再由組合器產生完整旅程
```

未來若重建新館，
這種「小語義單元 + 組合器」的方式仍然值得考慮。

### 3.4 手工解析庫

`archive/number-journeys.js` 很大，裡面有：

```yaml
careerJourneys:
  事業碼手工解析

familyJourneys:
  家庭碼手工解析

throneJourneys:
  坐鎮碼手工解析
```

這些內容不一定要直接上線，
但值得保留為材料庫。

比較好的處理方式：

```yaml
短期:
  不重寫
  不清洗
  不直接搬進新館主流程

中期:
  抽樣閱讀
  找出語氣、結構、洞見
  標出可再利用段落

長期:
  視需要重編成歷史資料、書稿素材或舊館精選
```

### 3.5 純靜態架構

舊站沒有框架，主要是：

```yaml
HTML
CSS
plain JavaScript
localStorage
```

這很適合保留為歷史區小工具。

它不需要伺服器，
也不需要資料庫，
只要放在靜態站裡就能跑。

---

## 4. 需要小心的地方

### 4.1 舊站語氣偏向身份 / 天賦 / 使命

舊站大量使用：

```yaml
- 你的生命靈數
- 天賦
- 靈魂使命
- 生命藍圖
- 核心使命
- 你最深的生命藍圖
```

這些語氣不是錯，
但它們會把使用者推向「我是什麼人」。

新館未來若要與協議對齊，
需要重新處理這個語氣。

但在現在這一步，
不必急著改。

只要先標記：

> **這是舊館語言，不是新館最終語言。**

### 4.2 組合器有重疊

舊站裡至少有兩套「旅程解析」邏輯：

```yaml
journey-composer.js:
  composeJourney()
  基於 number-dimensions.js 的 27 定義組合旅程

archive/number-journeys.js:
  getJourneyInterpretation()
  優先找手工解析
  找不到就用 generateJourney()
```

而 `deep-reading.html` 的載入順序是：

```html
numerology-pyramid.js
number-dimensions.js
journey-composer.js
archive/number-journeys.js
```

這代表 `archive/number-journeys.js` 後載入時，
可能會覆蓋 `journey-composer.js` 設定的 `window.getJourneyInterpretation`。

也就是說：

```yaml
README 宣稱:
  27 文本智慧系統是新組合核心

實際執行可能是:
  archive 的 getJourneyInterpretation 接管最終接口
```

這不是現在要修的 bug，
但它提醒我們：

> **新館重建時，計算核心與文本組合器必須重新收斂成單一清楚接口。**

### 4.3 資料與介面耦合

`index.html` 裡同時包含：

```yaml
- CSS
- HTML
- localStorage
- 生命靈數資料
- 計算函式
- DOM 更新
- 心情紀錄
```

這對早期原型很自然，
但不適合作為新館長期架構。

如果重建，
應拆成：

```yaml
core:
  計算與資料模型

content:
  文本、語氣、解讀資料

ui:
  使用者互動與顯示

history:
  舊館小工具
```

### 4.4 心情紀錄有趣，但不必先保證延續

舊站有心情按鈕與連續紀錄。

它讓工具有一點「每日回來看一下」的味道，
這是好的。

但它也會讓新館一開始變複雜。

建議：

```yaml
新館第一階段:
  不急著做心情紀錄

歷史區:
  可以保留舊站原本的 localStorage 小功能

未來:
  若新館需要每日入口，再重新設計
```

---

## 5. 建議分類

### 值得保留

```yaml
結構:
  - 生日輸入 -> 數字結果
  - 事業碼 / 家庭碼 / 坐鎮碼
  - 起因 / 過程 / 結果
  - 27 文本智慧架構
  - 智能組合 + 手工覆蓋的概念
  - 純靜態小工具形式

材料:
  - number-dimensions.js 的 27 組定義
  - archive/number-journeys.js 的手工解析
  - combo-tips.js 的今日能量提醒
  - README.md 裡對舊架構的說明
```

### 需要重新命名或重新理解

```yaml
生命靈數:
  舊館的入口名稱可以保留
  但新館不必接受它原本的命定語氣

天賦:
  可留作歷史詞
  新館未來可能改成傾向、模式、狀態或旅程

坐鎮碼:
  名字有味道
  但需要重新確認它在新館中的角色

使命 / 藍圖 / 靈魂:
  舊館語氣
  未來若使用，需加護欄
```

### 暫時封存

```yaml
UI:
  不急著沿用舊視覺

心情紀錄:
  先留在歷史小工具

Supabase 相關實驗:
  暫不納入生命靈數館重建主線

大型手工庫:
  先保留原樣
  不直接清洗
  不直接搬進新館
```

---

## 6. 新館與歷史區的分工

建議未來分成兩條線：

```yaml
新生命靈數館:
  從零設計第一個可用體驗
  不急著承接所有舊功能
  先做小而清楚的入口

歷史區 / 舊館小工具:
  保留舊站原貌或輕度整理
  標記為歷史版本
  讓人能回看早期生命靈數館如何運作
```

歷史區可以用這種文案定位：

> **這是早期生命靈數館的舊版小工具。**
> **它保留了當時的天賦金字塔、每日提醒與深度解析實驗。**
> **新館會重新設計，不完全沿用此處語言。**

---

## 7. 小步下一步

不建議下一步就開始大改。

比較穩的順序是：

```yaml
Step 1:
  在 darrenfiy.github.io 內規劃 history / old-hall 之類的歷史區位置
  只規劃，不急搬

Step 2:
  抽出舊站最小可運作清單:
    - index.html
    - deep-reading.html
    - combo-tips.js
    - numerology-pyramid.js
    - number-dimensions.js
    - journey-composer.js
    - archive/number-journeys.js

Step 3:
  決定歷史小工具是保留原樣，還是只加一個歷史提示條

Step 4:
  新館另開一個極小 prototype:
    - 先只輸入生日
    - 先只顯示一個數字
    - 先不做深度解析
    - 先確認「新館的語氣」是什麼

Step 5:
  再決定舊館哪些資料要被新館引用
```

---

## 8. 對這次重開張的提醒

目前最重要的不是技術選型，
而是避免新館一開始就背太多舊館的重量。

舊站可以留下，
但新館要有自己的呼吸。

```yaml
舊站:
  保存歷史
  保留材料
  作為小工具

新館:
  重新開始
  小步前進
  先找到自己的語氣
```

最後先收在這句：

> **先不急著把舊館修成新館。**
> **先讓舊館成為歷史區，讓新館可以重新出生。**

