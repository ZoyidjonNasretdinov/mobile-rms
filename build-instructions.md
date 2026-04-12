# Play Protect’ga qarshi Production Build qilish

App-ni Google Play Protect bloklamasligi uchun uni to‘g‘ri imzolangan (signed) va production rejimida build qilish kerak.

### 1-qadam: EAS CLI o‘rnatish

Agar hali o‘rnatmagan bo‘lsangiz, terminalda quyidagini yozing:

```bash
npm install -g eas-cli
```

### 2-qadam: EAS’ga kirish

```bash
eas login
```

### 3-qadam: Production Build qilish

Ushbu buyruq APK-ni production profilida build qiladi, unga avtomatik ravishda keystore (imzo) beradi va toza holatga keltiradi:

```bash
eas build -p android --profile preview
```

> [!NOTE]
> `preview` profili imzolangan APK-ni yuklab olish imkonini beradi. Agar to‘g‘ridan-to‘g‘ri Google Play Store’ga yuklamoqchi bo‘lsangiz, `--profile production` ishlating (u .aab formatida chiqaradi).

### 4-qadam: APK-ni yuklab olish va o‘rnatish

EAS build tugashi bilan terminalda link beradi. O‘sha APK-ni telefoningizga yuklab olib o‘rnating.

---

**Nima o‘zgardi?**

- `app.json` ichida keraksiz ruxsatnomalar (`permissions`) olib tashlandi.
- EAS orqali build qilish APK-ni professional darajada imzolaydi, bu esa Play Protect ishonchini oshiradi.
