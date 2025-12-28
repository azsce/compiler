# شرح كيفية عمل المحلل اللغوي (Lexer)

## نظرة عامة

المحلل اللغوي (Lexer) هو المرحلة الأولى في عملية الترجمة. يقوم بتحويل النص المصدري (source code) من سلسلة نصية إلى مصفوفة من الرموز (Tokens) من خلال **المسح الحرفي** (character-by-character scanning).

## البنية العامة

### المدخلات والمخرجات

- **المدخل**: سلسلة نصية (كود المصدر)
  ```typescript
  "x = 5 + 3"
  ```

- **المخرج**: مصفوفة من الرموز
  ```typescript
  [
    {type: 'IDENTIFIER', lexeme: 'x', position: {line: 1, column: 1}},
    {type: 'EQUALS', lexeme: '=', position: {line: 1, column: 3}},
    {type: 'INTEGER', lexeme: '5', literal: 5, position: {line: 1, column: 5}},
    {type: 'PLUS', lexeme: '+', position: {line: 1, column: 7}},
    {type: 'INTEGER', lexeme: '3', literal: 3, position: {line: 1, column: 9}},
    {type: 'EOF', lexeme: '', position: {line: 1, column: 10}}
  ]
  ```

## المتغيرات الداخلية

```typescript
private source: string;        // النص المصدري الكامل
private tokens: Token[] = [];  // مصفوفة الرموز المنتجة
private start = 0;              // بداية الرمز الحالي
private current = 0;            // الموقع الحالي في النص
private line = 1;               // رقم السطر الحالي
private column = 1;             // رقم العمود الحالي
private startColumn = 1;        // عمود بداية الرمز
```

## آلية العمل الرئيسية

### 1. دالة `tokenize()` - نقطة الدخول

```typescript
tokenize(): Token[] {
  while (!this.isAtEnd()) {
    this.start = this.current;
    this.startColumn = this.column;
    this.scanToken();
  }

  // إضافة رمز نهاية الملف
  this.tokens.push({
    type: 'EOF',
    lexeme: '',
    position: { line: this.line, column: this.column },
  });

  return this.tokens;
}
```

**الخطوات:**
1. حلقة تستمر حتى نهاية النص
2. حفظ موقع بداية كل رمز
3. استدعاء `scanToken()` لمسح رمز واحد
4. إضافة رمز EOF في النهاية
5. إرجاع مصفوفة الرموز

### 2. دالة `scanToken()` - تحديد نوع الرمز

```typescript
private scanToken(): void {
  const c = this.advance();

  switch (c) {
    case '+': this.addToken('PLUS'); break;
    case '-': this.addToken('MINUS'); break;
    case '*': this.addToken('STAR'); break;
    case '/': this.addToken('SLASH'); break;
    case '^': this.addToken('CARET'); break;
    case '(': this.addToken('LPAREN'); break;
    case ')': this.addToken('RPAREN'); break;
    case '=': this.addToken('EQUALS'); break;
    case '#': this.skipComment(); break;
    // ... معالجة الحالات الأخرى
  }
}
```

**تعمل بنظام switch-case:**
- المعاملات ذات الحرف الواحد: إنشاء رمز مباشرة
- الفراغات: تخطيها دون إنتاج رموز
- سطر جديد: زيادة رقم السطر
- التعليقات (`#`): تخطي كل شيء حتى نهاية السطر
- الأرقام: استدعاء `number()`
- الحروف: استدعاء `identifier()`
- أي شيء آخر: إنتاج رمز خطأ

## المكونات الرئيسية

### 1. مسح الأرقام - `number()`

```typescript
private number(): void {
  // مسح الجزء الصحيح
  while (this.isDigit(this.peek())) {
    this.advance();
  }

  // التحقق من النقطة العشرية
  let isFloat = false;
  if (this.peek() === '.' && this.isDigit(this.peekNext())) {
    isFloat = true;
    this.advance(); // استهلاك '.'

    // مسح الجزء العشري
    while (this.isDigit(this.peek())) {
      this.advance();
    }
  }

  const lexeme = this.source.substring(this.start, this.current);
  const literal = parseFloat(lexeme);

  this.addToken(isFloat ? 'FLOAT' : 'INTEGER', literal);
}
```

**الخطوات:**
1. استهلاك جميع الأرقام (الجزء الصحيح)
2. التحقق من وجود نقطة عشرية متبوعة برقم
3. إذا وجدت، استهلاك الجزء العشري
4. تحويل النص إلى رقم باستخدام `parseFloat()`
5. إنشاء رمز `INTEGER` أو `FLOAT` حسب النوع

**أمثلة:**
- `"123"` → `{type: 'INTEGER', lexeme: '123', literal: 123}`
- `"3.14"` → `{type: 'FLOAT', lexeme: '3.14', literal: 3.14}`
- `"5."` → `{type: 'INTEGER', lexeme: '5'}` (النقطة وحدها لا تكفي)

### 2. مسح المعرفات - `identifier()` (الكود المختار)

```typescript
private identifier(): void {
  while (this.isAlphaNumeric(this.peek())) {
    this.advance();
  }

  this.addToken('IDENTIFIER');
}
```

**كيف يعمل:**
1. **حلقة while**: تستمر طالما الحرف التالي هو حرف أو رقم
2. **`this.isAlphaNumeric(this.peek())`**: تحقق من الحرف دون استهلاكه
3. **`this.advance()`**: استهلاك الحرف والانتقال للتالي
4. **خارج الحلقة**: عندما يصل لحرف غير أبجدي رقمي (مثل فراغ أو معامل)
5. **إنشاء الرمز**: جميع المعرفات من نوع `IDENTIFIER`

**شروط المعرف الصحيح:**
```typescript
// يبدأ بحرف أو _ (يُحدد في isAlpha)
private isAlpha(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}

// يمكن أن يحتوي على حروف أو أرقام
private isAlphaNumeric(c: string): boolean {
  return this.isAlpha(c) || this.isDigit(c);
}
```

**أمثلة:**
- `"x"` → `{type: 'IDENTIFIER', lexeme: 'x'}`
- `"result"` → `{type: 'IDENTIFIER', lexeme: 'result'}`
- `"var_123"` → `{type: 'IDENTIFIER', lexeme: 'var_123'}`
- `"_temp"` → `{type: 'IDENTIFIER', lexeme: '_temp'}`

### 3. تخطي التعليقات - `skipComment()`

```typescript
private skipComment(): void {
  // استهلاك جميع الأحرف حتى سطر جديد أو نهاية الملف
  while (this.peek() !== '\n' && !this.isAtEnd()) {
    this.advance();
  }
  // السطر الجديد نفسه سيُعالج في استدعاء scanToken التالي
}
```

**مثال:**
```
x = 5 # هذا تعليق
y = 3
```
- الرمز `#` يُطلق `skipComment()`
- يتم تخطي `" هذا تعليق"`
- السطر الجديد يُعالج في الدورة التالية
- يستمر المسح من `y = 3`

## دوال المساعدة للتنقل

### 1. التقدم في النص - `advance()`

```typescript
private advance(): string {
  const c = this.source[this.current];
  this.current++;
  this.column++;
  return c;
}
```
- يقرأ الحرف الحالي
- يزيد مؤشر الموقع والعمود
- يُرجع الحرف

### 2. النظر للأمام - `peek()` و `peekNext()`

```typescript
private peek(): string {
  if (this.isAtEnd()) return '\0';
  return this.source[this.current];
}

private peekNext(): string {
  if (this.current + 1 >= this.source.length) return '\0';
  return this.source[this.current + 1];
}
```
- **`peek()`**: ينظر للحرف الحالي دون استهلاكه
- **`peekNext()`**: ينظر للحرف التالي
- مهم للتحقق من الأنماط متعددة الأحرف (مثل `3.14`)

### 3. فحص نهاية النص - `isAtEnd()`

```typescript
private isAtEnd(): boolean {
  return this.current >= this.source.length;
}
```

## تتبع الموقع (Line & Column Tracking)

المحلل يتتبع الموقع الدقيق لكل رمز:

```typescript
case '\n':
  this.line++;
  this.column = 1;  // إعادة تعيين العمود لبداية السطر الجديد
  break;
```

عند بداية كل رمز:
```typescript
this.start = this.current;
this.startColumn = this.column;
```

عند إنشاء الرمز:
```typescript
private getPosition(): Position {
  return { line: this.line, column: this.startColumn };
}
```

**أهمية ذلك:**
- رسائل خطأ دقيقة للمستخدم
- تحديد موقع المشاكل في الكود
- ربط الرموز بالنص الأصلي

## إنشاء الرموز - `addToken()`

```typescript
private addToken(type: TokenType, literal?: number): void {
  const lexeme = this.source.substring(this.start, this.current);
  const token: Token = {
    type,
    lexeme,
    position: this.getPosition(),
  };

  if (literal !== undefined) {
    token.literal = literal;
  }

  this.tokens.push(token);
}
```

**المكونات:**
- **type**: نوع الرمز (`'IDENTIFIER'`, `'INTEGER'`, إلخ)
- **lexeme**: النص الأصلي من المصدر
- **position**: موقع الرمز في الملف
- **literal**: القيمة الرقمية (للأرقام فقط)

## معالجة الأخطاء

```typescript
private addErrorToken(_message: string): void {
  const lexeme = this.source.substring(this.start, this.current);
  this.tokens.push({
    type: 'ERROR',
    lexeme,
    position: this.getPosition(),
  });
}
```

عند مواجهة حرف غير متوقع:
```typescript
default:
  if (this.isDigit(c)) {
    this.number();
  } else if (this.isAlpha(c)) {
    this.identifier();
  } else {
    this.addErrorToken(`Unexpected character '${c}'`);
  }
```

**مثال:**
- الإدخال: `x = 5 @ 3`
- الرمز `@` غير معروف
- يُنتج: `{type: 'ERROR', lexeme: '@', position: {line: 1, column: 7}}`

## مثال تطبيقي كامل

### الإدخال:
```
x = 10 + 3.5
# هذا تعليق
y = x ^ 2
```

### الخطوات التفصيلية:

1. **`x`**: 
   - `advance()` يقرأ `'x'`
   - `isAlpha('x')` = true
   - `identifier()` يُستدعى
   - ينتج: `{type: 'IDENTIFIER', lexeme: 'x', position: {line: 1, column: 1}}`

2. **فراغ**: يُتخطى

3. **`=`**:
   - `advance()` يقرأ `'='`
   - ينتج: `{type: 'EQUALS', lexeme: '=', position: {line: 1, column: 3}}`

4. **فراغ**: يُتخطى

5. **`10`**:
   - `advance()` يقرأ `'1'`
   - `isDigit('1')` = true
   - `number()` يُستدعى
   - يستمر بقراءة `'0'`
   - ينتج: `{type: 'INTEGER', lexeme: '10', literal: 10, position: {line: 1, column: 5}}`

6. **فراغ**: يُتخطى

7. **`+`**:
   - ينتج: `{type: 'PLUS', lexeme: '+', position: {line: 1, column: 8}}`

8. **فراغ**: يُتخطى

9. **`3.5`**:
   - `number()` يُستدعى
   - يقرأ `'3'`
   - يرى `'.'` متبوعة بـ `'5'`
   - `isFloat = true`
   - ينتج: `{type: 'FLOAT', lexeme: '3.5', literal: 3.5, position: {line: 1, column: 10}}`

10. **سطر جديد**:
    - `line++` → line = 2
    - `column = 1`

11. **`#`**:
    - `skipComment()` يُستدعى
    - يتخطى `" هذا تعليق"`

12. **سطر جديد**: line = 3

13. **`y`**:
    - ينتج: `{type: 'IDENTIFIER', lexeme: 'y', position: {line: 3, column: 1}}`

14. **`=`**, **`x`**, **`^`**, **`2`**: ... وهكذا

15. **نهاية الملف**:
    - ينتج: `{type: 'EOF', lexeme: '', position: {line: 3, column: 10}}`

### المخرج النهائي:
```typescript
[
  {type: 'IDENTIFIER', lexeme: 'x', position: {line: 1, column: 1}},
  {type: 'EQUALS', lexeme: '=', position: {line: 1, column: 3}},
  {type: 'INTEGER', lexeme: '10', literal: 10, position: {line: 1, column: 5}},
  {type: 'PLUS', lexeme: '+', position: {line: 1, column: 8}},
  {type: 'FLOAT', lexeme: '3.5', literal: 3.5, position: {line: 1, column: 10}},
  {type: 'IDENTIFIER', lexeme: 'y', position: {line: 3, column: 1}},
  {type: 'EQUALS', lexeme: '=', position: {line: 3, column: 3}},
  {type: 'IDENTIFIER', lexeme: 'x', position: {line: 3, column: 5}},
  {type: 'CARET', lexeme: '^', position: {line: 3, column: 7}},
  {type: 'INTEGER', lexeme: '2', literal: 2, position: {line: 3, column: 9}},
  {type: 'EOF', lexeme: '', position: {line: 3, column: 10}}
]
```

## الرموز المدعومة

### عمليات حسابية:
- `+` → `PLUS`
- `-` → `MINUS`
- `*` → `STAR`
- `/` → `SLASH`
- `^` → `CARET` (الأس)

### رموز أخرى:
- `=` → `EQUALS`
- `(` → `LPAREN`
- `)` → `RPAREN`

### قيم:
- أرقام صحيحة → `INTEGER`
- أرقام عشرية → `FLOAT`
- أسماء متغيرات → `IDENTIFIER`

### خاص:
- `#` → بداية تعليق (لا يُنتج رمز)
- نهاية الملف → `EOF`

## الخلاصة

المحلل اللغوي هو أساس عملية الترجمة:

- **البساطة**: منطق واضح مبني على switch-case
- **الدقة**: تتبع دقيق للموقع (سطر وعمود)
- **الكفاءة**: مسح واحد للنص (single-pass)
- **المرونة**: سهولة إضافة رموز جديدة
- **معالجة الأخطاء**: تحديد الأحرف غير المتوقعة

يحول النص من:
```
x = 5 + 3
```

إلى بنية منظمة يمكن للمحلل النحوي (Parser) فهمها:
```typescript
[IDENTIFIER, EQUALS, INTEGER, PLUS, INTEGER, EOF]
```

هذه الرموز هي اللبنات الأساسية التي تُبنى عليها شجرة البناء الجملي (AST) في المرحلة التالية.
