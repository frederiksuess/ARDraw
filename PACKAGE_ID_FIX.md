# 🔧 Problem: Apps überschreiben sich gegenseitig

## ❌ Das Problem

Wenn du mehrere PWAs von der gleichen Domain erstellst, versucht Android, die alte App zu "updaten" statt eine neue zu installieren.

**Grund:** Beide Apps haben die gleiche **Package ID** (Application ID).

## ✅ Die Lösung: Eindeutige Package ID

### In PWABuilder (EMPFOHLEN)

Wenn du das Android Package generierst:

1. **Gehe zu PWABuilder** → Deine App scannen
2. Klicke auf **"Android"** → **"Generate Package"**
3. **⚠️ WICHTIG:** Im Formular findest du **"Package ID"**

**Ändere die Package ID für jede App:**

#### App 1 (z.B. Nothing To-Do):
```
com.example.nothingtodo
```

#### App 2 (AR Zeichen-Hilfe):
```
com.example.arzeichenhilfe
```

**Format:** `com.deinname.appname` (alles kleingeschrieben, keine Leerzeichen, keine Sonderzeichen)

### Beispiele für gute Package IDs:

```
com.deinname.arzeichenhilfe
com.deinname.drawinghelper
de.deinname.zeichenapp
io.github.deinusername.arapp
```

## 📋 Schritt-für-Schritt in PWABuilder

### 1. Package Optionen öffnen
- Gehe zu PWABuilder
- Scanne deine URL
- Klicke "Android" → "Generate Package"

### 2. Package Settings anpassen

Du siehst ein Formular mit:

```
Package ID: com.example.myapp    ← HIER ÄNDERN!
App name: AR Zeichen-Hilfe
Version: 1.0.0
Host: deine-url.github.io
```

### 3. Package ID ändern

**Für AR Zeichen-Hilfe:**
```
Package ID: com.example.arzeichenhilfe
oder
Package ID: com.deinname.drawinghelper
oder
Package ID: de.vorname.nachname.arapp
```

**Wichtig:**
- ✅ Nur Kleinbuchstaben
- ✅ Punkte als Trenner
- ✅ Keine Leerzeichen
- ✅ Keine Umlaute (ä → ae, ö → oe, ü → ue)
- ✅ Mindestens 2 Teile (com.name oder de.name)

### 4. Package generieren
- Klicke "Generate"
- Lade das `.aab` oder `.apk` herunter

## 🎯 Eindeutige Package IDs für deine Apps

### Vorschlag für deine Apps:

**App 1 - Nothing To-Do:**
```
Package ID: com.example.nothingtodo
```

**App 2 - AR Zeichen-Hilfe:**
```
Package ID: com.example.arzeichenhilfe
```

Oder mit deinem Namen:
```
com.deinname.nothingtodo
com.deinname.arzeichenhilfe
```

## 🔍 Package ID überprüfen

### Bei bereits installierter App:

**Android:**
1. Einstellungen → Apps
2. Finde deine App
3. Tippe auf "App-Info"
4. Scrolle nach unten
5. Siehst du die Package ID (z.B. `com.example.myapp`)

**Mit ADB (Advanced):**
```bash
adb shell pm list packages | grep example
# Zeigt alle installierten Packages mit "example"
```

## 🆕 Neue APK installieren

Nach der Änderung der Package ID:

1. **Alte App NICHT deinstallieren** (bleibt als separate App)
2. **Neue APK installieren**
3. **Beide Apps sind jetzt separat installiert!** ✅

## 📱 Was passiert jetzt?

**Vorher:**
- 1 App-Icon (wird "geupdatet")

**Nachher:**
- 2 separate App-Icons
- "Nothing To-Do" App
- "AR Zeichen-Hilfe" App

## ⚠️ Wichtig für Google Play Store

Wenn du Apps in den Play Store hochlädst:

**Jede App braucht:**
- ✅ Eindeutige Package ID
- ✅ Eigenen Store-Eintrag
- ✅ Eigene Screenshots
- ✅ Eigene Beschreibung

**Die Package ID kann NACH dem Upload NICHT mehr geändert werden!**

Wähle sie also sorgfältig:
```
Gut: com.deinname.arzeichenhilfe
Schlecht: com.test.app1
```

## 🎨 Manifest.json anpassen (Optional)

Du kannst auch direkt im `manifest.json` einen Hint geben:

```json
{
  "id": "/ar-zeichen-hilfe/",
  "name": "AR Zeichen-Hilfe",
  "short_name": "AR Zeichnen"
}
```

Das `id` Feld hilft, Apps zu unterscheiden (aber Package ID in PWABuilder ist wichtiger).

## 🔄 Falls du schon eine APK hast

**Problem:** APK schon heruntergeladen mit falscher Package ID

**Lösung:**
1. Gehe zurück zu PWABuilder
2. Scanne die URL erneut
3. Klicke "Android" → "Generate Package"
4. **Ändere die Package ID** (siehe oben)
5. Generate → Neues Package herunterladen
6. Diese neue APK installieren

## 📝 Checkliste

Bevor du eine APK generierst:

- [ ] Package ID ist eindeutig für diese App
- [ ] Package ID ist anders als bei anderen Apps
- [ ] Package ID ist Kleinbuchstaben
- [ ] Package ID hat keine Leerzeichen/Sonderzeichen
- [ ] App Name ist korrekt
- [ ] Version ist korrekt (z.B. 1.0.0)

## 💡 Best Practice

**Wenn du mehrere Apps machst, verwende ein System:**

```
com.deinname.nothingtodo     ← To-Do App
com.deinname.arzeichenhilfe  ← Zeichen App
com.deinname.budgettracker   ← Budget App
com.deinname.recipebook      ← Rezepte App
```

Oder mit Kategorien:
```
com.deinname.productivity.todo
com.deinname.creative.drawing
com.deinname.finance.budget
```

## 🆘 Noch Probleme?

**Wenn Android immer noch "Update" statt "Installieren" sagt:**

1. **Überprüfe Package ID** der installierten App
2. **Deinstalliere die alte App** (wenn du sie nicht brauchst)
3. **Installiere die neue APK**

Oder:

1. **Generiere neue APK** mit anderer Package ID
2. **Installiere diese**
3. **Beide Apps laufen parallel**

---

## 🎉 Zusammenfassung

**Das Problem:** Gleiche Package ID → Apps überschreiben sich

**Die Lösung:** Eindeutige Package ID in PWABuilder setzen:
- App 1: `com.example.nothingtodo`
- App 2: `com.example.arzeichenhilfe`

**Dann:** Beide Apps getrennt installierbar! ✅
