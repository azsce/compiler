# شرح كيفية عمل المحلل النحوي (Parser)

## نظرة عامة

المحلل النحوي يستخدم **التحليل الهابط العودي (Recursive Descent Parsing)** مع **تسلق الأسبقية (Precedence Climbing)** لتحويل الرموز (Tokens) إلى شجرة بناء جملة مجردة (AST).

## البنية العامة

### المدخلات والمخرجات

- **المدخل**: مصفوفة من الرموز من المحلل اللغوي
  ```typescript
  [{type: 'IDENTIFIER', lexeme: 'x'}, {type: 'EQUALS'}, {type: 'INTEGER', literal: 5}]
  ```

- **المخرج**: عقد AST تمثل بنية البرنامج
  ```typescript
  {kind: 'Assignment', name: 'x', value: {...}}
  ```

- **معالجة الأخطاء**: يجمع أخطاء بناء الجملة ويتوقف عند أول خطأ

## المكونات الرئيسية

### 1. التنقل بين الرموز (Token Navigation)

الدوال الأساسية للتنقل:

- `peek()`: النظر إلى الرمز الحالي دون استهلاكه
- `advance()`: الانتقال إلى الرمز التالي
- `check()`: فحص نوع الرمز
- `match()`: مطابقة أنواع الرموز والتقدم إذا تطابقت
- `expect()`: يتطلب رمزًا محددًا أو يرمي خطأ

### 2. تحليل التعليمات (Statement Parsing)

#### التمييز بين الإسناد والتعبيرات

```typescript
// السطور 165-168: فحص نمط الإسناد
if (this.check('IDENTIFIER') && this.lookAhead(1)?.type === 'EQUALS') {
  return this.parseAssignment();
}
```

- إذا رأى `IDENTIFIER` متبوعًا بـ `EQUALS`، يحلل كإسناد
- وإلا، يحلل كتعبير مستقل
- يتحقق من عدم وجود رموز غير متوقعة بعد التعليمات

### 3. تحليل التعبيرات مع الأسبقية (Expression Parsing with Precedence)

#### الكود المختار (السطور 259-262)

```typescript
while (this.match('PLUS', 'MINUS')) {
  const operator = this.previous().lexeme as '+' | '-';
  const position = this.previous().position;
  const right = this.parseMultiplicative();
```

هذا الكود جزء من `parseAdditive()` ويعمل كالتالي:

1. **حلقة While**: تستمر طالما وجدت `+` أو `-`
2. **الترابط الأيسر**: كل عملية تصبح العنصر الأيسر للعملية التالية
3. **استدعاء أعلى أسبقية**: يستدعي `parseMultiplicative()` للحصول على العنصر الأيمن

#### التسلسل الهرمي للأسبقية (من الأدنى للأعلى)

1. **الجمع والطرح** (`parseAdditive`) - عمليات `+` و `-`
   - أسبقية منخفضة
   - ترابط أيسر (left-associative)

2. **الضرب والقسمة** (`parseMultiplicative`) - عمليات `*` و `/`
   - أسبقية متوسطة
   - ترابط أيسر

3. **الأس** (`parsePower`) - عملية `^`
   - أسبقية عالية
   - **ترابط أيمن** (right-associative)
   - يستدعي نفسه عوديًا للعنصر الأيمن

4. **العمليات الأحادية** (`parseUnary`) - `+` و `-` البادئة
   - أسبقية أعلى
   - يمكن تسلسلها (`--x`)

5. **التعبيرات الأساسية** (`parsePrimary`) - الذرات
   - أعلى أسبقية
   - الأرقام الصحيحة والعشرية
   - المتغيرات
   - التعبيرات بين أقواس

## مثال تطبيقي

### تحليل: `x = 2 + 3 * 4`

#### الخطوات:

1. **كشف نمط الإسناد**
   ```
   IDENTIFIER ('x') + EQUALS → استدعاء parseAssignment()
   ```

2. **تحليل التعبير `2 + 3 * 4`**
   ```
   parseExpression() → parseAdditive()
   ```

3. **الحصول على العنصر الأيسر**
   ```
   parseMultiplicative() → parsePower() → parseUnary() → parsePrimary()
   النتيجة: Literal(2)
   ```

4. **رؤية المعامل `+`**
   ```
   match('PLUS') = true
   ```

5. **تحليل العنصر الأيمن `3 * 4`**
   ```
   parseMultiplicative() يتم استدعاؤه
   - العنصر الأيسر: Literal(3)
   - المعامل: '*'
   - العنصر الأيمن: Literal(4)
   - النتيجة: BinaryExpr(*, 3, 4)
   ```

6. **بناء الشجرة النهائية**
   ```
   Assignment(
     name: 'x',
     value: BinaryExpr(
       operator: '+',
       left: Literal(2),
       right: BinaryExpr(
         operator: '*',
         left: Literal(3),
         right: Literal(4)
       )
     )
   )
   ```

## لماذا يعمل هذا التسلسل الهرمي؟

### الأسبقية التلقائية

- كل مستوى أسبقية يستدعي المستوى الأعلى التالي
- هذا يضمن أن العمليات ذات الأسبقية الأعلى "تربط" أولاً
- في `2 + 3 * 4`:
  - `parseAdditive` يحصل على `2` أولاً
  - عند رؤية `+`, يستدعي `parseMultiplicative` للعنصر الأيمن
  - `parseMultiplicative` يرى `3 * 4` بالكامل ويبني عقدة واحدة
  - النتيجة: `2 + (3 * 4)` بدون حاجة لجداول أسبقية صريحة

### الترابط الأيسر مقابل الأيمن

#### ترابط أيسر (while loop):
```typescript
// 1 - 2 - 3 يصبح (1 - 2) - 3
while (this.match('MINUS')) {
  left = new BinaryExpr(left, operator, right);
}
```

#### ترابط أيمن (recursion):
```typescript
// 2 ^ 3 ^ 4 يصبح 2 ^ (3 ^ 4)
if (this.match('CARET')) {
  const right = this.parsePower(); // استدعاء عودي!
  return new BinaryExpr(left, operator, right);
}
```

## الخلاصة

المحلل يستخدم بنية أنيقة حيث:
- **البساطة**: كل مستوى أسبقية = دالة واحدة
- **الصحة**: التسلسل الهرمي يضمن الأسبقية الصحيحة تلقائيًا
- **المرونة**: إضافة عمليات جديدة سهلة
- **الوضوح**: الكود يعكس قواعد اللغة مباشرة

## ملاحظات إضافية

### معالجة الأخطاء

المحلل يتوقف عند أول خطأ (لا يوجد استرداد من الأخطاء):

```typescript
try {
  const stmt = this.parseStatement();
  if (stmt) {
    statements.push(stmt);
  }
} catch {
  // التوقف عند أول خطأ
  break;
}
```

### التحقق من الرموز غير المتوقعة

بعد كل تعبير أو إسناد، يتحقق المحلل من عدم وجود رموز إضافية:

```typescript
if (!this.isAtEnd()) {
  const nextToken = this.peek();
  const isNewStatement = 
    nextToken.type === 'IDENTIFIER' && this.lookAhead(1)?.type === 'EQUALS';
  
  if (!isNewStatement) {
    this.addError(
      `Unexpected token '${nextToken.lexeme}' after expression`,
      nextToken.position
    );
  }
}
```

هذا يضمن أن تعبيرات مثل `1 + 2 3` ترمي خطأً بدلاً من تجاهل `3`.
