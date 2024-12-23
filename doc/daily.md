
## localStorage ===========================

New Project | newProject |
localStorage.removeItem("appState");

//Import | importJsonAction
const content = cloneDeep(toRaw(appState.value));
const file = new Blob([JSON.stringify(content)], {
    type: "application/json",
});

Export | exportToJsonAction

//Save | save
const data = cloneDeep(toRaw(appState.value));
localStorage.setItem("appState", JSON.stringify(data));

//IndexPage load default
const localState = localStorage.getItem("appState");
if (localState) {
  appState.value = JSON.parse(localState);
}

//saveSelectedToClipboard
localStorage.setItem("clipboard", JSON.stringify(selectedItems));

//pasteFromClipboard
const clipboard = localStorage.getItem("clipboard");

localStorage.setItem("user", JSON.stringify(user.value));
localStorage.setItem("user", JSON.stringify(user.value));

//in webview load data from GET_INITIAL_DATA_RES and set to appState.value
//not in webview load data from localStorage.getItem('appState')

## localStorage ===========================
