# Terra Nova: setup guide

A relaxing farming game about soil, mulch and compost. It's plain HTML, CSS and JavaScript, with nothing to install or build.

## Play it on your computer

Open `index.html` in a browser. Your farm saves in that browser.

## Let friends play and save to the same place

By default each farm only saves in the browser it was played in. To share one save space (so a friend can type their name on any device and carry on), connect a free Firebase Realtime Database. It takes about five minutes and needs no code changes except one line.

1. Go to <https://console.firebase.google.com> and click **Add project** (name it anything, e.g. `terra-nova`; you can turn off Google Analytics).
2. In the left menu choose **Build → Realtime Database → Create database**. Pick a location and start in **locked mode**.
3. Open the **Rules** tab, paste the contents of [`firebase-rules.json`](firebase-rules.json) and click **Publish**.
4. On the **Data** tab, copy the database URL at the top (it looks like `https://terra-nova-12345-default-rtdb.firebaseio.com`).
5. Paste it into [`js/config.js`](js/config.js):

   ```js
   window.FarmConfig = {
     dbUrl: "https://terra-nova-12345-default-rtdb.firebaseio.com",
   };
   ```

6. Commit and push. The title screen will now say your farm is saved online, and show the other farmers' names.

**How saving works:** every farm is stored under the lowercase version of the name typed at the start, so `Maya`, `maya` and ` MAYA ` all open the same farm. The game also keeps a copy on the device, and when it loads it picks whichever is newer.

**Good to know:** there are no passwords. Anyone who types an existing name opens that farm, which is fine among friends but not for strangers. The rules in `firebase-rules.json` stop anyone from listing every save at once, but anyone who knows a name can still open, overwrite or delete that one farm.

## Put it online with GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository go to **Settings → Pages**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, and save.
3. After a minute the game is live at `https://<your-username>.github.io/<repository-name>/`. That's the link to send to friends.

## Project layout

```
index.html        the page and the order scripts load in
css/style.css     all the styling
js/config.js      <- where to paste the online save URL
js/core.js        small helpers, events, sound
js/data.js        places, crops, materials and the "Field notes" lessons
js/storage.js     saving and loading (device + online)
js/sim.js         time, weather, soil, water and plant growth
js/plants.js      drawing the plants as they grow
js/art.js         drawing the ground, buildings, farmer and tractor
js/actors.js      the farmer, the tractor and the chore queue
js/game.js        tools, clicks and autosave
js/ui.js          sign-in, toolbar, notes and menus
js/main.js        the render loop and input
```
