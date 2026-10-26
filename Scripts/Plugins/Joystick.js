(function JoystickPlugin() {
    function SetEnabled(On) {
        const Api = globalThis.MolTouch;
        if (!Api) return;
        if (On) Api.Enable();
        else Api.Disable();
    }

    function OpenWidget(Api) {
        SetEnabled(true);

        Api.CreateWidget({
            Id: "joystick",
            Title: "Touch Controls",
            X: 16,
            Y: 120,
            Width: 280,
            OnClose() {
                SetEnabled(false);
            },
            Build(Body) {
                const Overview = Api.AddSection(Body, "On-screen move", true);

                const Hint = document.createElement("div");
                Hint.className = "WHint";
                Hint.textContent = "Joystick moves in the camera plane. Up / Down move vertically. Close this panel to hide the controls.";
                Overview.appendChild(Hint);

                const SensRow = document.createElement("div");
                SensRow.className = "WRow";
                SensRow.innerHTML = `<label>Sensitivity</label>`;
                const Sens = document.createElement("input");
                Sens.type = "range";
                Sens.className = "WRange";
                Sens.min = "0.35";
                Sens.max = "2";
                Sens.step = "0.05";
                Sens.value = String(globalThis.MolTouch?.GetSensitivity?.() ?? 1);
                const SensVal = document.createElement("span");
                SensVal.className = "WValue";
                SensVal.textContent = Number(Sens.value).toFixed(2);
                Sens.addEventListener("input", () => {
                    const V = Number(Sens.value) || 1;
                    SensVal.textContent = V.toFixed(2);
                    globalThis.MolTouch?.SetSensitivity?.(V);
                });
                SensRow.appendChild(Sens);
                SensRow.appendChild(SensVal);
                Overview.appendChild(SensRow);

                const Status = document.createElement("div");
                Status.className = "WStatRow";
                Status.innerHTML = `<span>Overlay</span><span id="JoyStatus">Active</span>`;
                Overview.appendChild(Status);

                const Actions = document.createElement("div");
                Actions.className = "WActions";
                const HideBtn = document.createElement("button");
                HideBtn.className = "WPrimary";
                HideBtn.textContent = "Hide controls";
                HideBtn.addEventListener("click", () => {
                    SetEnabled(false);
                    const Widget = document.querySelector('.PluginWidget[data-widget-id="joystick"]');
                    if (Widget) {
                        const CloseBtn = Widget.querySelector(".WidgetBtn");
                        if (CloseBtn) CloseBtn.click();
                        else Widget.classList.add("WidgetHidden");
                    }
                    const Item = document.querySelector('.PluginDockItem[data-plugin-id="joystick"]');
                    if (Item) Item.classList.remove("active");
                    if (globalThis.Plugin?.Emit) globalThis.Plugin.Emit("ClosePlugin", { Id: "joystick" });
                });
                Actions.appendChild(HideBtn);
                Overview.appendChild(Actions);
            }
        });
    }

    const Entry = {
        Id: "joystick",
        Name: "Touch Controls",
        Version: "1.0.0",
        Description: "On-screen joystick and vertical move buttons for touch / non-keyboard use",
        Setup(Api) {
            Api.On("OpenPlugin", ({ Id }) => {
                if (Id === "joystick") OpenWidget(Api);
            });
            Api.On("ClosePlugin", ({ Id }) => {
                if (Id === "joystick") SetEnabled(false);
            });
        },
        Open(Api) {
            OpenWidget(Api);
        }
    };

    if (globalThis.Plugin) {
        globalThis.Plugin.Register(Entry);
    } else {
        globalThis.FentPlugins = globalThis.FentPlugins || [];
        globalThis.FentPlugins.push(Entry);
    }
})();