# AR Zeichen-Hilfe PWA

Eine Progressive Web App zum Lernen von Zeichnen mit Augmented Reality.

## Features

✨ **Hauptfunktionen:**
- 📷 Kamera-basierte AR-Projektion
- 🖼️ PNG/JPG/SVG Vorlagen hochladen
- 📏 Hilfsraster und Ausrichtungsmarker
- 🎯 Touch-basierte Positionierung und Skalierung
- 🔄 Rotation und Perspektiven-Korrektur
- 👁️ Transparenz-Kontrolle
- 🔒 Position-Lock Funktion
- 📱 Vollständig offline nutzbar (PWA)

## Verwendung

1. **Vorlage laden**: Klicke auf "Vorlage laden" und wähle ein Bild
2. **Positionieren**: Berühre und ziehe mit dem Finger, um die Vorlage zu positionieren
3. **Skalieren**: Pinch-to-Zoom mit zwei Fingern
4. **Anpassen**: Nutze die Einstellungen für Rotation, Transparenz, etc.
5. **Zeichnen**: Platziere dein Papier unter der Kamera und zeichne nach

## Technische Details

- **Framework**: Vanilla JavaScript (keine Dependencies)
- **PWA-Ready**: Service Worker für Offline-Nutzung
- **Responsive**: Funktioniert auf Smartphones und Tablets
- **Kamera**: Verwendet MediaDevices API
- **Canvas**: Dual-Canvas-System für Template und Overlay

## Konvertierung zu Android APK mit PWABuilder

### ✅ PWABuilder-Ready
Alle Fehler wurden behoben:
- ✅ Icon-Links korrigiert (mit führendem `/`)
- ✅ Icon-Typen spezifiziert (`image/png`)
- ✅ Separate `any` und `maskable` Purpose-Icons
- ✅ Shortcut-Icons mit vollständigem Type
- ✅ Hochauflösende Icons (192x192 und 512x512)
- ✅ Screenshot hinzugefügt

### Schritt 1: Lokales Hosting (optional für Test)
```bash
# Mit Python
python -m http.server 8000

# Mit Node.js
npx http-server -p 8000
```

### Schritt 2: Deployment
Lade die App auf einen Webserver hoch (z.B. GitHub Pages, Netlify, Vercel):

**GitHub Pages:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <dein-repo>
git push -u origin main
```
Dann in Settings → Pages → Source: main branch aktivieren.

**Netlify/Vercel:**
- Einfach den Ordner hochladen oder mit Git verbinden

### Schritt 3: PWABuilder verwenden

1. Gehe zu https://www.pwabuilder.com
2. Gib deine URL ein (z.B. https://deinbenutzername.github.io/ar-zeichen-hilfe)
3. Klicke auf "Start"
4. PWABuilder analysiert deine App
5. Wähle "Android" als Plattform
6. Klicke auf "Generate Package"
7. Lade das APK-Paket herunter
8. Folge den Anweisungen zum Signieren und Hochladen in Google Play Store

### Alternativ: Trusted Web Activity (TWA)
PWABuilder erstellt automatisch eine TWA-basierte App, die:
- Im Google Play Store veröffentlicht werden kann
- Die volle Chrome-Engine nutzt
- Zugriff auf alle Web-APIs hat
- Keine separate Codebase benötigt

## Wichtige Hinweise für PWABuilder

### Manifest.json
✅ Bereits enthalten und korrekt konfiguriert
- Name, Icons, Theme-Color
- Display: standalone
- Start URL konfiguriert

### Service Worker
✅ Implementiert für Offline-Funktionalität
- Caching-Strategie
- Fetch-Handler
- Update-Mechanismus

### Icons
✅ Icons in 192x192 und 512x512 vorhanden
- Für bessere Qualität: Ersetze durch hochauflösende Versionen
- Empfohlen: Erstelle maskable Icons für Android

### HTTPS
⚠️ Wichtig: PWAs benötigen HTTPS
- GitHub Pages: Automatisch HTTPS
- Netlify/Vercel: Automatisch HTTPS
- Eigener Server: Let's Encrypt SSL-Zertifikat verwenden

## Browser-Kompatibilität

- ✅ Chrome/Edge (Android)
- ✅ Safari (iOS 11.3+)
- ✅ Firefox (Android)
- ✅ Samsung Internet

## Kamera-Berechtigungen

Die App benötigt Kamera-Zugriff:
- Android: Automatisch beim ersten Start abgefragt
- iOS: System-Dialog beim ersten Kamera-Zugriff

## Verbesserungsvorschläge

1. **Bessere Icons**: Erstelle professionelle Icons mit transparentem Hintergrund
2. **Screenshots**: Füge Screenshots für den Play Store hinzu
3. **Tracking**: Optional Google Analytics oder ähnliches
4. **Teilen-Funktion**: Erlaube das Teilen von Zeichnungen
5. **Vorlage-Bibliothek**: Sammlung vorinstallierter Vorlagen
6. **Tutorial**: Onboarding-Tutorial für neue Nutzer

## Lizenz

MIT License - Frei verwendbar für private und kommerzielle Projekte

## Support

Bei Fragen oder Problemen:
1. Überprüfe die Browser-Konsole
2. Stelle sicher, dass HTTPS aktiv ist
3. Teste Kamera-Berechtigungen
4. Prüfe PWABuilder-Dokumentation

---

**Entwickelt für kreative Köpfe 🎨**
