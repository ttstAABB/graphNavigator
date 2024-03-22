import { app } from "/scripts/app.js";

const id = "graphNavigator";

app.registerExtension({
    name: id,
    async setup() {
        
        let updateGraph;
        var views = [];

        const menu = document.querySelector(".comfy-menu");

        const separator = document.createElement("hr");
        separator.style.margin = "20px 0";
        separator.style.width = "100%";
        menu.append(separator);

        const graphNavigatorDiv = document.createElement("div");
        graphNavigatorDiv.classList.add("graphNavigator");
        graphNavigatorDiv.classList.add("comfy-menu-btns");
        graphNavigatorDiv.style.width = "100%";

        const viewsList = document.createElement("ul");
        viewsList.classList.add("views-list");
        viewsList.style.listStyleType = "none";

        viewsList.style.padding = 0;
        viewsList.style.margin = 0;

        // save view
        const addButton = document.createElement("button");
        addButton.textContent = "💾";
        addButton.style.width = "25%";
        addButton.style.fontSize = "large";
        addButton.style.margin = "10px 0";
        addButton.onclick = () => {
            const viewName = `View ${views.length + 1}`;
            const { ds: { scale, offset } } = app.canvas;

            const view = {
                name: viewName,
                scale,
                offsetX: offset[0],
                offsetY: offset[1],
            };

            views.push(view);
            renderView(view);
            saveViews();
        };
        
        // update menu
        graphNavigatorDiv.append(viewsList);
        graphNavigatorDiv.append(addButton);
        menu.append(graphNavigatorDiv);

        const renderView = (view) => {
            const listItem = document.createElement("li");
            listItem.classList.add("view");
            listItem.draggable = true;

            listItem.ondragstart = (event) => {
                event.dataTransfer.setData("text/plain", views.findIndex((v) => v.name === view.name));
            };

            listItem.ondragover = (event) => {
                event.preventDefault();
            };

            listItem.ondrop = (event) => {
                event.preventDefault();
                const draggedViewIndex = parseInt(event.dataTransfer.getData("text/plain"), 10);
                const targetViewIndex = views.findIndex((v) => v.name === view.name);

                // Swap views
                [views[draggedViewIndex], views[targetViewIndex]] = [views[targetViewIndex], views[draggedViewIndex]];

                // Re-render the views list
                viewsList.innerHTML = "";
                views.forEach(renderView);

                saveViews();
            };

            const name = document.createElement("button");
            name.classList.add("view-name");
            name.classList.add("button");
            name.style.fontSize = "medium";
            name.style.width = "80%";
            name.textContent = view.name;
            name.onclick = () => {
                updateGraph(view);
            };

            name.ondblclick = () => {
                const newName = prompt("Enter a new name for the view:", name.textContent);
                if (newName) {
                    view.name = newName;
                    name.textContent = newName;
                    saveViews();
                }
            };

            listItem.append(name);
            viewsList.append(listItem);

            // Add context menu
            listItem.oncontextmenu = (event) => {
                event.preventDefault();
                const contextMenu = document.createElement("div");
                contextMenu.classList.add("context-menu");
                contextMenu.style.position = "absolute";
                contextMenu.style.top = event.clientY + "px";
                contextMenu.style.left = event.clientX + "px";
                contextMenu.style.backgroundColor = "white";
                contextMenu.style.border = "1px solid black";
                contextMenu.style.zIndex = 1000;

                // Recapture menu item
                const recaptureMenuItem = document.createElement("button");
                recaptureMenuItem.textContent = "Recapture";
                recaptureMenuItem.style.display = "inherit";
                recaptureMenuItem.onclick = () => {
                    const { ds: { scale, offset } } = app.canvas;
                    view.scale = scale;
                    view.offsetX = offset[0];
                    view.offsetY = offset[1];
                    saveViews();
                    contextMenu.remove();
                };
                contextMenu.append(recaptureMenuItem);

                // Rename menu item
                const renameMenuItem = document.createElement("button");
                renameMenuItem.textContent = "Rename";
                renameMenuItem.style.display = "inherit";
                renameMenuItem.onclick = () => {
                    const newName = prompt("Enter a new name for the view:", name.textContent);
                    if (newName) {
                        view.name = newName;
                        name.textContent = newName;
                        saveViews();
                    }
                    contextMenu.remove();
                };
                contextMenu.append(renameMenuItem);

                // Delete menu item
                const deleteMenuItem = document.createElement("button");
                deleteMenuItem.textContent = "Delete";
                deleteMenuItem.style.display = "inherit";
                deleteMenuItem.onclick = () => {
                    const index = views.findIndex((v) => v.name === view.name);
                    if (index !== -1) {
                        views.splice(index, 1);
                        saveViews();
                    }
                    listItem.remove();
                    contextMenu.remove();
                };
                contextMenu.append(deleteMenuItem);

                document.body.append(contextMenu);

                // Close the context menu when clicking outside of it
                window.addEventListener("click", () => {
                    contextMenu.remove();
                });
            };

            // Add horizontal line after every 4 views
            const index = views.findIndex((v) => v.name === view.name);
            if (index % 4 === 3) {
                const separator = document.createElement("hr");
                separator.style.margin = "10px 0";
                separator.style.width = "100%";
                viewsList.append(separator);
            }

            // update graph scale and offset
            updateGraph = (view) => {
                const { offsetX, offsetY, scale } = view;
                app.canvas.setZoom(scale);
                app.canvas.ds.offset = new Float32Array([offsetX, offsetY]);
                app.canvas.setDirty(true, true);
            }

        };

        const saveViews = () => {
            // save views to local storage
            localStorage.setItem(id, JSON.stringify(views));
        };

        let handleKeyDown;
        
        const updateShortcuts = (shortcutString) => {
            const shortcuts = shortcutString.split(",").map((shortcut) => shortcut.trim());
            if (handleKeyDown) {
                document.removeEventListener("keydown", handleKeyDown);
            }
            handleKeyDown = (event) => {
                const focusedElement = document.activeElement;
                const isTextInput = focusedElement.tagName === "INPUT" && focusedElement.type === "text";
                const isTextArea = focusedElement.tagName === "TEXTAREA";
                const isContentEditable = focusedElement.contentEditable === "true";
            
                if (!isTextInput && !isTextArea && !isContentEditable) {
                    const pressedKeys = [];
                    if (event.ctrlKey) pressedKeys.push("Ctrl");
                    if (event.shiftKey) pressedKeys.push("Shift");
                    if (event.altKey) pressedKeys.push("Alt");
                    pressedKeys.push(getFKeyIndex(event.code));
        
                    const pressedKeysString = pressedKeys.join("+");
                    const index = shortcuts.findIndex((shortcut) => shortcut === pressedKeysString);
                    if (index >= 0 && views[index]) {
                        const view = views[index];
                        updateGraph(view);
                        event.preventDefault();
                    }
                }
            };
            document.addEventListener("keydown", handleKeyDown);
        };

        let shortcutSetting;
        let useCtrlSetting;
        let useShiftSetting;

        const loadViews = () => {
            // load views from local storage
            try {
                const loadedViews = localStorage.getItem(id);
                if (loadedViews) {
                    var read = JSON.parse(loadedViews);
                    if (typeof(views.push) != 'function')
                        throw new Error("");
                    views = read;
                    for (let key in views) {
                        let view = views[key];
                        renderView(view);
                    }
                }
            } catch (error) {
                console.log("graphNavigator loading error");
                localStorage.removeItem('graphNavigator');
            }
            const shortcutString = shortcutSetting?.value || "";
            //const useCtrl = useCtrlSetting?.value || false;
            //const useShift = useShiftSetting?.value || false;
            //updateShortcuts(shortcutString, useCtrl, useShift);
            updateShortcuts(shortcutString);
        };
        const init = () => {
            shortcutSetting = app.ui.settings.addSetting({
                id: "shortcut",
                name: "View Shortcut Keys",
                defaultValue: "Digit1,Digit2,Digit3,Digit4,Shift+Digit1,Shift+Digit2,Shift+Digit3,Shift+Digit4",
                type: "string",
                onChange(value) {
                    updateShortcuts(value, useCtrlSetting?.value || false, useShiftSetting?.value || false);
                },
            });

            /*
            useCtrlSetting = app.ui.settings.addSetting({
                id: "useCtrl",
                name: "Use Ctrl Key",
                defaultValue: false,
                type: "boolean",
                onChange(value) {
                    updateShortcuts(shortcutSetting?.value || "", value, useShiftSetting?.value || false);
                },
            });

            useShiftSetting = app.ui.settings.addSetting({
                id: "useShift",
                name: "Use Shift Key",
                defaultValue: false,
                type: "boolean",
                onChange(value) {
                    updateShortcuts(shortcutSetting?.value || "", useCtrlSetting?.value || false, value);
                },
            });
            */
        };

        init();
        loadViews();
    },
});

function getFKeyIndex(code) {
    if (code.startsWith("F")) {
        const index = parseInt(code.slice(1), 10);
        if (!isNaN(index)) {
            return index;
        }
    }
    return code;
}
