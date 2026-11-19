Outfit Match-maker – web app prototype

How to open
  Double-click index.html. It opens in your web browser. No installation needed.

Pages (left sidebar)
  Dashboard    Type what you are going to do ("party tonight, something black")
               and press Style me, or drag clothes onto the Outfit board to check
               if they match.
  My wardrobe  All your clothes. Use "Add clothes" to add a piece with a photo,
               type and colour. Delete with the x.
  Shop         Sample products from partner shops. "Try on board" puts a product
               next to your own clothes on the dashboard.
  My profile   Name, style, favourite colours and skin tone.

Add clothes with a photo
  Take or upload a photo in Wardrobe > Add Clothes. The app reads the clothing type,
  colour and material from the photo and selects them for you; tap to change anything.
  Your wardrobe then shows a clean studio picture in that colour, or, if you choose
  "My photo, cleaned", your own photo with the background removed.
  Everything runs on the device; the photo is never uploaded. The first time, the app
  downloads the analyser (about 90 MB) and the background remover (about 45 MB) and
  keeps them for next time, so the first photo needs internet.
  Models: Marqo FashionSigLIP (Apache-2.0) and BRIA RMBG-1.4 (non-commercial use).

Notes
  - Your wardrobe and profile are saved in this browser only.
  - "Reset demo data" on the profile page brings back the sample wardrobe.
  - The styling is rule-based for the prototype (colour theory + occasion rules).
  - Fonts load from the internet; offline the app uses standard fonts.

Android app (OnePlus Pad Go 2 or any Android 8+ tablet/phone)
  Match-maker.apk is the app. It shows this website full screen and works offline.
  Install: copy Match-maker.apk to the tablet (USB, Google Drive, etc.), open it in
  Files, and allow "Install unknown apps" for Files when Android asks.
  Your wardrobe and profile in the app are saved on the tablet, separate from the browser.

  Rebuild after changing the website (index.html, css/, js/):
    cd android-app && ./gradlew assembleDebug
  The new APK is android-app/app/build/outputs/apk/debug/app-debug.apk.
  You can also open the android-app folder in Android Studio and press Run.
