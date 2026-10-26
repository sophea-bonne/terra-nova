/* Where do saved farms live?

   Leave dbUrl empty and every farm is saved only in the browser it was played in.
   To let friends share one save "cloud", paste your Firebase Realtime Database URL
   here (see SETUP.md — it takes about five minutes), e.g.

     dbUrl: "https://terra-nova-12345-default-rtdb.firebaseio.com"
*/
window.FarmConfig = {
  dbUrl: "",
  /* Development switch: every level is open from the start. Turn this off before sharing the game. */
  dev: true,
};
