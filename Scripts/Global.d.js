const Canvas = document.querySelector(".Canvas");
let CanvasRenderer = null;
globalThis.CanvasRenderer = null;

function WithRenderer(Fn) {
    if (!CanvasRenderer) return;
    return Fn(CanvasRenderer);
}


const FramerateLabel = document.querySelector(".Framerate");
const DeltaTimeLabel = document.querySelector(".DeltaTime");
const TimeScaleLabel = document.querySelector(".TimeScale");
const TemperatureLabel = document.querySelector(".Temperature");
const BathTempLabel = document.querySelector(".BathTemp");
const BoundsSizeLabel = document.querySelector(".BoundsSize");
const Tooltip = document.querySelector(".Tooltip");
const ContextMenu = document.getElementById("ContextMenu");
let ContextTarget = null;

function ClampWidget(Element) {
    if (!Element || Element.classList.contains("WidgetHidden")) return;
    const Rect = Element.getBoundingClientRect();
    if (Rect.width < 4) return;
    const Margin = 8;
    const MaxLeft = Math.max(Margin, window.innerWidth - Rect.width - Margin);
    const MaxTop = Math.max(Margin, window.innerHeight - Math.min(Rect.height, 48) - Margin);
    const Left = Math.min(Math.max(Margin, Rect.left), MaxLeft);
    const Top = Math.min(Math.max(Margin, Rect.top), MaxTop);
    Element.style.right = "auto";
    Element.style.bottom = "auto";
    Element.style.left = `${Left}px`;
    Element.style.top = `${Top}px`;
}

function ClampAllWidgets() {
    document.querySelectorAll(".PluginWidget").forEach(ClampWidget);
}

const ResizeCanvas = () => {
    if (CanvasRenderer) CanvasRenderer.Resize();
    ClampAllWidgets();
    PositionDisplayMenu();
};
window.addEventListener("resize", ResizeCanvas);
window.addEventListener("orientationchange", () => setTimeout(ResizeCanvas, 120));

new MutationObserver((Records) => {
    for (const Record of Records) {
        for (const Node of Record.addedNodes) {
            if (Node.classList && Node.classList.contains("PluginWidget")) {
                requestAnimationFrame(() => ClampWidget(Node));
            }
        }
    }
}).observe(document.body, { childList: true });

document.addEventListener("click", (Event) => {
    if (Event.target.closest && Event.target.closest(".PluginDockBtn")) setTimeout(ClampAllWidgets, 0);
});

async function BootRenderer() {
    await globalThis.LoadShaders();
    CanvasRenderer = new Renderer(Canvas);
    globalThis.CanvasRenderer = CanvasRenderer;
    CanvasRenderer.Temperature = 0.05;
    CanvasRenderer.FreeEnergy = 0;
    CanvasRenderer.Friction = 0.45;
    CanvasRenderer.SettleFrames = 240;
    if (typeof Prefs !== "undefined") {
        if (Prefs.ShakeIntensity != null) CanvasRenderer.ShakeIntensity = Prefs.ShakeIntensity;
        if (Prefs.BoundX != null) CanvasRenderer.BoundaryX = Prefs.BoundX;
        if (Prefs.BoundY != null) CanvasRenderer.BoundaryY = Prefs.BoundY;
        if (Prefs.BoundZ != null) CanvasRenderer.BoundaryZ = Prefs.BoundZ;
    }
    ResizeCanvas();
    if (globalThis.Plugin) globalThis.Plugin.Boot();
    requestAnimationFrame(Update);
}

BootRenderer().catch((Err) => {
    console.error(Err);
    const Msg = document.createElement("div");
    Msg.textContent = "Failed to start renderer: " + (Err && Err.message ? Err.message : String(Err));
    Msg.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font:16px monospace;z-index:99999;padding:24px;text-align:center";
    document.body.appendChild(Msg);
});

const KeyStates = {};
const CameraVelocity = [0, 0, 0];
const CameraAcceleration = 0.375;
const CameraDamping = 0.975;

let TargetYaw = -Math.PI / 2;
let TargetPitch = 0;
let CurrentYaw = -Math.PI / 2;
let CurrentPitch = 0;
let IsRmbDown = false;

let SelectedObject = null;
let HoveredObject = null;
let IsInteracting = false;
let DragPlanePoint = [0, 0, 0];
let DragPlaneNormal = [0, 0, 1];
let InitialHitOffset = [0, 0, 0];

let LastDragPosition = [0, 0, 0];
let LastDragTime = performance.now();
let ThrowVelocity = [0, 0, 0];
let DragSamples = [];
const DragSampleWindowMs = 60;

const UiSelector = ".Area, .ContextMenu, .Tooltip, .PluginWidget, .PluginDock, .DropdownMenu, .MobileBar, .TouchControls, .SpawnMenu, button, select, input, label, textarea, canvas.WGraph";

const IsTouchDevice = (typeof window !== "undefined") && (
    "ontouchstart" in window ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)
);

window.addEventListener("contextmenu", (Event) => Event.preventDefault());

const MobilePanels = [document.getElementById("DashboardPanel"), document.getElementById("HierarchyPanel")];
const MobileButtons = document.querySelectorAll(".MobileBtn");

function ClosePanels() {
    for (const Panel of MobilePanels) if (Panel) Panel.classList.remove("Open");
    MobileButtons.forEach((Btn) => Btn.classList.remove("active"));
    CloseDisplayMenu();
}

MobileButtons.forEach((Btn) => {
    Btn.addEventListener("click", (Event) => {
        Event.stopPropagation();
        const Target = document.getElementById(Btn.dataset.target);
        if (!Target) return;
        const WillOpen = !Target.classList.contains("Open");
        ClosePanels();
        if (WillOpen) {
            Target.classList.add("Open");
            Btn.classList.add("active");
        }
    });
});

const DisplayButton = document.getElementById("DisplayDropdownButton");
const DisplayLabel = document.getElementById("DisplayDropdownLabel");
const DisplayMenu = document.getElementById("DisplayDropdownMenu");
const DisplayItems = DisplayMenu ? [...DisplayMenu.querySelectorAll(".DropdownItem")] : [];

if (DisplayMenu) document.body.appendChild(DisplayMenu);

function PositionDisplayMenu() {
    if (!DisplayMenu || !DisplayButton || DisplayMenu.hidden) return;
    const Rect = DisplayButton.getBoundingClientRect();
    const Margin = 8;
    const SpaceBelow = window.innerHeight - Rect.bottom - Margin;
    const SpaceAbove = Rect.top - Margin;
    const MenuHeight = DisplayMenu.scrollHeight;
    const OpenUp = SpaceBelow < Math.min(MenuHeight, 240) && SpaceAbove > SpaceBelow;
    const Width = Math.min(Math.max(Rect.width, 180), window.innerWidth - Margin * 2);
    const Left = Math.min(Math.max(Margin, Rect.left), window.innerWidth - Width - Margin);
    DisplayMenu.style.width = `${Width}px`;
    DisplayMenu.style.left = `${Left}px`;
    if (OpenUp) {
        DisplayMenu.style.top = "auto";
        DisplayMenu.style.bottom = `${window.innerHeight - Rect.top + 6}px`;
        DisplayMenu.style.maxHeight = `${Math.max(120, SpaceAbove - 6)}px`;
    } else {
        DisplayMenu.style.bottom = "auto";
        DisplayMenu.style.top = `${Rect.bottom + 6}px`;
        DisplayMenu.style.maxHeight = `${Math.max(120, SpaceBelow - 6)}px`;
    }
}

function OpenDisplayMenu() {
    if (!DisplayMenu || !DisplayButton) return;
    DisplayMenu.hidden = false;
    DisplayButton.setAttribute("aria-expanded", "true");
    PositionDisplayMenu();
}

function CloseDisplayMenu() {
    if (!DisplayMenu || !DisplayButton) return;
    DisplayMenu.hidden = true;
    DisplayButton.setAttribute("aria-expanded", "false");
}

function SetDisplayMode(Mode) {
    if (CanvasRenderer) CanvasRenderer.DisplayMode = Mode;
    for (const Item of DisplayItems) {
        const Active = Item.dataset.mode === Mode;
        Item.classList.toggle("active", Active);
        Item.setAttribute("aria-selected", Active ? "true" : "false");
        if (Active && DisplayLabel) DisplayLabel.textContent = Item.textContent.trim();
    }
}

if (DisplayButton && DisplayMenu) {
    DisplayButton.addEventListener("click", (Event) => {
        Event.stopPropagation();
        if (DisplayMenu.hidden) OpenDisplayMenu();
        else CloseDisplayMenu();
    });

    DisplayButton.addEventListener("keydown", (Event) => {
        if (Event.key === "ArrowDown" || Event.key === "ArrowUp") {
            Event.preventDefault();
            OpenDisplayMenu();
            const Active = DisplayItems.find((Item) => Item.classList.contains("active")) || DisplayItems[0];
            if (Active) Active.focus();
        } else if (Event.key === "Escape") {
            CloseDisplayMenu();
        }
    });

    DisplayMenu.addEventListener("keydown", (Event) => {
        const Index = DisplayItems.indexOf(document.activeElement);
        if (Event.key === "ArrowDown") {
            Event.preventDefault();
            DisplayItems[(Index + 1) % DisplayItems.length].focus();
        } else if (Event.key === "ArrowUp") {
            Event.preventDefault();
            DisplayItems[(Index - 1 + DisplayItems.length) % DisplayItems.length].focus();
        } else if (Event.key === "Escape") {
            Event.preventDefault();
            CloseDisplayMenu();
            DisplayButton.focus();
        }
    });

    for (const Item of DisplayItems) {
        Item.addEventListener("click", (Event) => {
            Event.stopPropagation();
            SetDisplayMode(Item.dataset.mode);
            CloseDisplayMenu();
            DisplayButton.focus({ preventScroll: true });
        });
    }

    window.addEventListener("pointerdown", (Event) => {
        if (DisplayMenu.hidden) return;
        if (DisplayMenu.contains(Event.target) || DisplayButton.contains(Event.target)) return;
        CloseDisplayMenu();
    }, true);

    const ScrollParent = document.getElementById("DashboardPanel");
    if (ScrollParent) ScrollParent.addEventListener("scroll", CloseDisplayMenu, { passive: true });

    SetDisplayMode("none");
}

function HideContextMenu() {
    if (ContextMenu) ContextMenu.hidden = true;
    ContextTarget = null;
}

function ShowContextMenu(Atom, X, Y) {
    if (!ContextMenu || !Atom) return;
    ContextTarget = Atom;
    SelectedObject = Atom;
    CanvasRenderer.SelectedObject = Atom;
    const Title = ContextMenu.querySelector(".CtxTitle");
    if (Title) {
        const A = Atom.Atom;
        const MassNumber = (Atom.Protons || 0) + (Atom.Neutrons || 0);
        const Charge = Atom.ExtraCharge || 0;
        const ChargeStr = Math.abs(Charge) > 0.05 ? ` ${Charge > 0 ? "+" : ""}${Charge.toFixed(2)}e` : "";
        Title.textContent = `${Atom.Key}${ChargeStr} | ${A.Name || Atom.Key} | A=${MassNumber}`;
    }
    ContextMenu.hidden = false;
    const MenuW = ContextMenu.offsetWidth || 180;
    const MenuH = ContextMenu.offsetHeight || 280;
    let Left = X + 4;
    let Top = Y + 4;
    if (Left + MenuW > window.innerWidth) Left = X - MenuW - 4;
    if (Top + MenuH > window.innerHeight) Top = Y - MenuH - 4;
    ContextMenu.style.left = `${Math.max(4, Left)}px`;
    ContextMenu.style.top = `${Math.max(4, Top)}px`;
}

window.addEventListener("mousedown", (Event) => {
    const ClickedInsideMenu = ContextMenu && !ContextMenu.hidden && ContextMenu.contains(Event.target);
    const ClickedUi = Event.target.closest(UiSelector);

    if (ClickedInsideMenu || ClickedUi) {
        if (!ClickedInsideMenu && ContextMenu && !ContextMenu.hidden) HideContextMenu();
        return;
    }

    if (ContextMenu && !ContextMenu.hidden) HideContextMenu();
    ClosePanels();

    if (Event.button === 2) {
        const MousePos = { x: Event.clientX, y: Event.clientY };
        const Ray = GetScreenRay(MousePos.x, MousePos.y);
        const AtomHit = PickAtom(Ray);
        if (AtomHit) {
            ShowContextMenu(AtomHit, MousePos.x, MousePos.y);
            IsRmbDown = false;
            return;
        }
        IsRmbDown = true;
        return;
    }

    if (Event.button === 0) {
        const MousePos = { x: Event.clientX, y: Event.clientY };
        const Ray = GetScreenRay(MousePos.x, MousePos.y);
        const AtomHit = PickAtom(Ray);
        if (AtomHit) {
            SelectedObject = AtomHit;
            CanvasRenderer.SelectedObject = SelectedObject;
            IsInteracting = true;
            const Forward = GetCameraForward();
            DragPlaneNormal = [-Forward[0], -Forward[1], -Forward[2]];
            DragPlanePoint = [...SelectedObject.Position];
            const Intersection = RayPlaneIntersection(Ray.Origin, Ray.Direction, DragPlanePoint, DragPlaneNormal);
            if (Intersection) {
                InitialHitOffset = [
                    SelectedObject.Position[0] - Intersection[0],
                    SelectedObject.Position[1] - Intersection[1],
                    SelectedObject.Position[2] - Intersection[2]
                ];
                LastDragPosition = [
                    Intersection[0] + InitialHitOffset[0],
                    Intersection[1] + InitialHitOffset[1],
                    Intersection[2] + InitialHitOffset[2]
                ];
                LastDragTime = performance.now();
                ThrowVelocity = [0, 0, 0];
                DragSamples = [{ t: LastDragTime, p: [...LastDragPosition] }];
            }
        } else {
            SelectedObject = null;
            CanvasRenderer.SelectedObject = null;
        }
    }
});

function ComputeThrowFromSamples() {
    if (DragSamples.length < 2) return [0, 0, 0];
    const Now = DragSamples[DragSamples.length - 1].t;
    const Recent = DragSamples.filter((S) => Now - S.t <= DragSampleWindowMs);
    if (Recent.length < 2) return [0, 0, 0];
    const First = Recent[0];
    const Last = Recent[Recent.length - 1];
    const Dt = Math.max(0.008, (Last.t - First.t) / 1000);
    const Scale = 0.085;
    return [
        (Last.p[0] - First.p[0]) / Dt * Scale,
        (Last.p[1] - First.p[1]) / Dt * Scale,
        (Last.p[2] - First.p[2]) / Dt * Scale
    ];
}

window.addEventListener("mouseup", (Event) => {
    if (Event.button === 2) IsRmbDown = false;
    if (Event.button === 0) {
        if (IsInteracting && SelectedObject) {
            ThrowVelocity = ComputeThrowFromSamples();
            const Mag = Math.sqrt(
                ThrowVelocity[0] * ThrowVelocity[0] +
                ThrowVelocity[1] * ThrowVelocity[1] +
                ThrowVelocity[2] * ThrowVelocity[2]
            );
            if (Mag < 0.35) ThrowVelocity = [0, 0, 0];
            SelectedObject.Velocity = [...ThrowVelocity];
        }
        IsInteracting = false;
        DragSamples = [];
    }
});

window.addEventListener("mousemove", (Event) => {
    const MousePos = { x: Event.clientX, y: Event.clientY };

    if (IsRmbDown) {
        const Sensitivity = 0.002;
        TargetYaw += Event.movementX * Sensitivity;
        TargetPitch -= Event.movementY * Sensitivity;
        const PitchLimit = Math.PI / 2 - 0.01;
        TargetPitch = Math.max(-PitchLimit, Math.min(PitchLimit, TargetPitch));
    }

    if (IsTouchDevice) return;
    if (Event.target && Event.target.closest && Event.target.closest(".PluginWidget, .PluginDock")) {
        if (Tooltip) Tooltip.style.opacity = "0";
        return;
    }

    const Ray = GetScreenRay(MousePos.x, MousePos.y);

    if (IsInteracting && SelectedObject) {
        if (Tooltip) Tooltip.style.opacity = "0";
        const Intersection = RayPlaneIntersection(Ray.Origin, Ray.Direction, DragPlanePoint, DragPlaneNormal);
        if (Intersection) {
            const CurrentTime = performance.now();
            const NewPos = [
                Intersection[0] + InitialHitOffset[0],
                Intersection[1] + InitialHitOffset[1],
                Intersection[2] + InitialHitOffset[2]
            ];
            DragSamples.push({ t: CurrentTime, p: [...NewPos] });
            while (DragSamples.length > 0 && CurrentTime - DragSamples[0].t > DragSampleWindowMs * 2) {
                DragSamples.shift();
            }
            SelectedObject.Position[0] = NewPos[0];
            SelectedObject.Position[1] = NewPos[1];
            SelectedObject.Position[2] = NewPos[2];
            SelectedObject.Velocity = [0, 0, 0];
            LastDragPosition = NewPos;
            LastDragTime = CurrentTime;
        }
    } else {
        HoveredObject = PickAtom(Ray);
        CanvasRenderer.HoveredObject = HoveredObject;
        if (HoveredObject && Tooltip) {
            const A = HoveredObject.Atom;
            const Z = HoveredObject.Protons || A.AtomicNumber || 0;
            const N = HoveredObject.Neutrons || 0;
            const MassNumber = Z + N;
            let Text = `${HoveredObject.Key} | ${A.Name || HoveredObject.Key} | Z=${Z} N=${N} A=${MassNumber}`;
            if (!HoveredObject.Stable) Text += ` | UNSTABLE`;
            const Charge = HoveredObject.ExtraCharge || 0;
            if (Math.abs(Charge) > 0.05) {
                Text += ` | q=${Charge > 0 ? "+" : ""}${Charge.toFixed(2)}e`;
            }
            const Sat = HoveredObject.BondSatisfaction;
            if (Sat !== undefined && Sat > 0.01 && Sat < 0.99) {
                Text += ` | sat ${(Sat * 100).toFixed(0)}%`;
            }
            if (HoveredObject.Excited > 0.05) Text += ` | *${HoveredObject.Excited.toFixed(1)}`;
            Tooltip.textContent = Text;
            Tooltip.style.opacity = "1";
            const TipWidth = Tooltip.offsetWidth || 200;
            const TipLeft = Math.min(MousePos.x + 14, window.innerWidth - TipWidth - 8);
            Tooltip.style.left = `${Math.max(8, TipLeft)}px`;
            Tooltip.style.top = `${MousePos.y + 14}px`;
        } else if (Tooltip) {
            Tooltip.style.opacity = "0";
        }
    }
});

function IsTextEntryFocused() {
    const El = document.activeElement;
    if (!El) return false;
    const Tag = (El.tagName || "").toLowerCase();
    if (Tag === "input" || Tag === "textarea" || Tag === "select") return true;
    if (El.isContentEditable) return true;
    if (El.closest && El.closest("[contenteditable='true']")) return true;
    return false;
}

function ClearMovementKeys() {
    for (const Code of ["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight"]) {
        KeyStates[Code] = false;
    }
}

window.addEventListener("keydown", (Event) => {
    if (IsTextEntryFocused()) {
        if (Event.code === "Escape") {
            HideContextMenu();
            CloseDisplayMenu();
            const SpawnMenu = document.getElementById("SpawnMenu");
            if (SpawnMenu) SpawnMenu.hidden = true;
            document.activeElement?.blur?.();
        }
        return;
    }
    KeyStates[Event.code] = true;
    if (Event.code === "Escape") {
        HideContextMenu();
        CloseDisplayMenu();
        const SpawnMenu = document.getElementById("SpawnMenu");
        if (SpawnMenu) {
            SpawnMenu.hidden = true;
            const Opts = document.getElementById("SpawnOptsBtn");
            if (Opts) Opts.setAttribute("aria-expanded", "false");
        }
    }
});

window.addEventListener("keyup", (Event) => {
    KeyStates[Event.code] = false;
});

document.addEventListener("focusin", (Event) => {
    if (IsTextEntryFocused()) ClearMovementKeys();
});

if (ContextMenu) {
    ContextMenu.addEventListener("mousedown", (Event) => {
        Event.preventDefault();
        Event.stopPropagation();
        const Btn = Event.target.closest("button[data-action]");
        if (!Btn || !ContextTarget) return;
        if (Event.button !== 0) return;
        const Action = Btn.dataset.action;
        const Atom = ContextTarget;

        switch (Action) {
            case "excite":
                Atom.Excited = Math.min(3, (Atom.Excited || 0) + Prefs.ExciteAmount);
                Atom.Velocity[0] += (Math.random() - 0.5) * Prefs.ExciteAmount * 3;
                Atom.Velocity[1] += (Math.random() - 0.5) * Prefs.ExciteAmount * 3;
                Atom.Velocity[2] += (Math.random() - 0.5) * Prefs.ExciteAmount * 3;
                break;
            case "deexcite":
                Atom.Excited = 0;
                Atom.Velocity[0] *= 0.3;
                Atom.Velocity[1] *= 0.3;
                Atom.Velocity[2] *= 0.3;
                break;
            case "impulse": {
                const Dir = GetCameraForward();
                const Imp = Prefs.ImpulseStrength;
                Atom.Velocity[0] += Dir[0] * Imp;
                Atom.Velocity[1] += Dir[1] * Imp;
                Atom.Velocity[2] += Dir[2] * Imp;
                break;
            }
            case "heat":
                Atom.Excited = Math.min(3, (Atom.Excited || 0) + Prefs.ExciteAmount * 0.5);
                CanvasRenderer.Temperature = Math.min(2, CanvasRenderer.Temperature + 0.08);
                break;
            case "cool":
                Atom.Excited = Math.max(0, (Atom.Excited || 0) - 0.5);
                Atom.Velocity[0] *= 0.5;
                Atom.Velocity[1] *= 0.5;
                Atom.Velocity[2] *= 0.5;
                CanvasRenderer.Temperature = Math.max(0, CanvasRenderer.Temperature - 0.08);
                break;
            case "breakbonds": {
                const Idx = Objects.indexOf(Atom);
                if (Idx >= 0) {
                    CanvasRenderer.PreviousBondPairs = new Set(CanvasRenderer.ActiveBondPairs);
                    const ToRemove = [];
                    for (const Key of CanvasRenderer.ActiveBondPairs) {
                        const [A, B] = Key.split("_").map(Number);
                        if (A === Idx || B === Idx) ToRemove.push(Key);
                    }
                    for (const Key of ToRemove) {
                        CanvasRenderer.ActiveBondPairs.delete(Key);
                        CanvasRenderer.BondData.delete(Key);
                    }
                    CanvasRenderer.BreakJointsOf(Atom);
                }
                break;
            }
            case "ionize": Atom.ExtraCharge = (Atom.ExtraCharge || 0) + 0.6; break;
            case "neutralize": Atom.ExtraCharge = 0; break;
            case "decay":
                if (CanvasRenderer.DecayAtom) CanvasRenderer.DecayAtom(Atom);
                break;
            case "focus": {
                CanvasRenderer.CameraTarget = [...Atom.Position];
                const Fwd = GetCameraForward();
                CanvasRenderer.CameraPosition = [
                    Atom.Position[0] - Fwd[0] * 350,
                    Atom.Position[1] - Fwd[1] * 350,
                    Atom.Position[2] - Fwd[2] * 350
                ];
                break;
            }
            case "delete": {
                CanvasRenderer.RemoveAtom(Atom);
                if (SelectedObject === Atom) { SelectedObject = null; CanvasRenderer.SelectedObject = null; }
                if (HoveredObject === Atom) { HoveredObject = null; CanvasRenderer.HoveredObject = null; }
                IsInteracting = false;
                break;
            }
        }
        HideContextMenu();
    });
}

window.addEventListener("wheel", (Event) => {
    if (Event.target && Event.target.closest && Event.target.closest(".Area, .DropdownMenu, .PluginWidget, .ContextMenu")) return;
    Event.preventDefault();
    if (Event.ctrlKey) {
        if (!CanvasRenderer) return;
        const Snap = 0.05;
        const Delta = Event.deltaY < 0 ? Snap : -Snap;
        let NextScale = Math.round((CanvasRenderer.TargetTimeScale + Delta) / Snap) * Snap;
        NextScale = Math.max(0.0, Math.min(4.0, NextScale));
        CanvasRenderer.TargetTimeScale = Number(NextScale.toFixed(2));
        if (NextScale <= 0) CanvasRenderer.TimeScale = 0;
    } else if (Event.altKey) {
        const Snap = 0.05;
        const Delta = Event.deltaY < 0 ? Snap : -Snap;
        let NextTemp = Math.round((CanvasRenderer.Temperature + Delta) / Snap) * Snap;
        NextTemp = Math.max(0.0, Math.min(2.0, NextTemp));
        CanvasRenderer.Temperature = Number(NextTemp.toFixed(2));
        const BathEl = document.getElementById("PrefBath");
        const BathVal = document.getElementById("PrefBathVal");
        if (BathEl) BathEl.value = String(NextTemp);
        if (BathVal) BathVal.textContent = NextTemp.toFixed(2);
    } else {
        const ZoomSpeed = 5;
        const Direction = Event.deltaY < 0 ? 1 : -1;
        const Forward = GetCameraForward();
        CameraVelocity[0] += Forward[0] * Direction * ZoomSpeed;
        CameraVelocity[1] += Forward[1] * Direction * ZoomSpeed;
        CameraVelocity[2] += Forward[2] * Direction * ZoomSpeed;
    }
}, { passive: false });

{
    const BathEl = document.getElementById("PrefBath");
    const BathVal = document.getElementById("PrefBathVal");
    if (BathEl) BathEl.value = "0.05";
    if (BathVal) BathVal.textContent = "0.05";
}

function GetCameraForward() {
    return [
        Math.cos(CurrentPitch) * Math.cos(CurrentYaw),
        Math.sin(CurrentPitch),
        Math.cos(CurrentPitch) * Math.sin(CurrentYaw)
    ];
}

function GetScreenRay(ScreenX, ScreenY) {
    const Rect = Canvas.getBoundingClientRect();
    const NdcX = ((ScreenX - Rect.left) / Rect.width) * 2 - 1;
    const NdcY = -(((ScreenY - Rect.top) / Rect.height) * 2 - 1);
    const Aspect = Canvas.width / Canvas.height;
    const Fov = Math.PI / 4;
    const TanFov = Math.tan(Fov / 2);
    const Forward = GetCameraForward();
    const Up = [0, 1, 0];
    const Right = Normalize3(Cross3(Forward, Up));
    const TrueUp = Cross3(Right, Forward);
    const RayDir = Normalize3([
        Forward[0] + Right[0] * NdcX * TanFov * Aspect + TrueUp[0] * NdcY * TanFov,
        Forward[1] + Right[1] * NdcX * TanFov * Aspect + TrueUp[1] * NdcY * TanFov,
        Forward[2] + Right[2] * NdcX * TanFov * Aspect + TrueUp[2] * NdcY * TanFov
    ]);
    if (!CanvasRenderer) return { Origin: [0, 0, 900], Direction: RayDir };
    return { Origin: [...CanvasRenderer.CameraPosition], Direction: RayDir };
}

function RaySphereIntersection(RayOrigin, RayDir, SphereCenter, SphereRadius) {
    const Oc = Subtract3(SphereCenter, RayOrigin);
    const Tca = Dot3(Oc, RayDir);
    if (Tca < 0) return null;
    const D2 = Dot3(Oc, Oc) - Tca * Tca;
    const Radius2 = SphereRadius * SphereRadius;
    if (D2 > Radius2) return null;
    const Thc = Math.sqrt(Radius2 - D2);
    return Tca - Thc;
}

function RayPlaneIntersection(RayOrigin, RayDir, PlanePoint, PlaneNormal) {
    const Denom = Dot3(PlaneNormal, RayDir);
    if (Math.abs(Denom) < 0.0001) return null;
    const T = Dot3(Subtract3(PlanePoint, RayOrigin), PlaneNormal) / Denom;
    if (T < 0) return null;
    return [
        RayOrigin[0] + RayDir[0] * T,
        RayOrigin[1] + RayDir[1] * T,
        RayOrigin[2] + RayDir[2] * T
    ];
}

function PickAtom(Ray) {
    let Closest = null;
    let ClosestT = Infinity;
    for (const Obj of Objects) {
        if (!CanvasRenderer) return null;
        const Radius = Math.max(8, (Obj.Atom.AtomicRadius ?? 100) * CanvasRenderer.RadiusScale * 0.3);
        const HitT = RaySphereIntersection(Ray.Origin, Ray.Direction, Obj.Position, Radius);
        if (HitT !== null && HitT < ClosestT) {
            ClosestT = HitT;
            Closest = Obj;
        }
    }
    return Closest;
}

const TouchControls = document.getElementById("TouchControls");
const Joystick = document.getElementById("Joystick");
const JoystickKnob = document.getElementById("JoystickKnob");
const TouchUpButton = document.getElementById("TouchUp");
const TouchDownButton = document.getElementById("TouchDown");
const JoystickInput = [0, 0];
const JoystickSmoothed = [0, 0];
const JoystickDeadZone = 0.12;
let JoystickPointer = null;
let VerticalSmoothed = 0;
const VerticalPointers = new Map();

let TouchSensitivity = 1;

function EnableTouchUi() {
    if (!TouchControls) return;
    document.body.classList.add("TouchUi");
    TouchControls.hidden = false;
    TouchControls.setAttribute("aria-hidden", "false");
}

function DisableTouchUi() {
    document.body.classList.remove("TouchUi");
    if (TouchControls) {
        TouchControls.hidden = true;
        TouchControls.setAttribute("aria-hidden", "true");
    }
    ResetJoystick();
    VerticalPointers.clear();
    if (TouchUpButton) TouchUpButton.classList.remove("Active");
    if (TouchDownButton) TouchDownButton.classList.remove("Active");
    VerticalSmoothed = 0;
    JoystickSmoothed[0] = 0;
    JoystickSmoothed[1] = 0;
}

globalThis.MolTouch = {
    Enable: EnableTouchUi,
    Disable: DisableTouchUi,
    IsEnabled() { return document.body.classList.contains("TouchUi"); },
    GetSensitivity() { return TouchSensitivity; },
    SetSensitivity(V) { TouchSensitivity = Math.max(0.25, Math.min(2.5, Number(V) || 1)); },
    GetJoystick() { return JoystickSmoothed; },
    GetVertical() { return VerticalSmoothed; }
};

// Do not auto-show; open the Touch Controls plugin instead.

function ResetJoystick() {
    JoystickPointer = null;
    JoystickInput[0] = 0;
    JoystickInput[1] = 0;
    if (JoystickKnob) {
        JoystickKnob.classList.remove("Active");
        JoystickKnob.style.transform = "translate(0px, 0px)";
    }
}

function UpdateJoystickFromEvent(Event) {
    const Rect = Joystick.getBoundingClientRect();
    const Radius = Rect.width * 0.5;
    const MaxTravel = Math.max(1, Radius - JoystickKnob.offsetWidth * 0.3);
    let Dx = Event.clientX - (Rect.left + Radius);
    let Dy = Event.clientY - (Rect.top + Radius);
    const Len = Math.hypot(Dx, Dy);
    if (Len > MaxTravel) {
        Dx *= MaxTravel / Len;
        Dy *= MaxTravel / Len;
    }
    JoystickKnob.style.transform = `translate(${Dx}px, ${Dy}px)`;
    let Nx = Dx / MaxTravel;
    let Ny = Dy / MaxTravel;
    const Mag = Math.hypot(Nx, Ny);
    if (Mag < JoystickDeadZone) {
        JoystickInput[0] = 0;
        JoystickInput[1] = 0;
        return;
    }
    const Scale = Math.min(1, (Mag - JoystickDeadZone) / (1 - JoystickDeadZone)) / Mag;
    JoystickInput[0] = Nx * Scale;
    JoystickInput[1] = -Ny * Scale;
}

if (Joystick && JoystickKnob) {
    Joystick.addEventListener("pointerdown", (Event) => {
        if (JoystickPointer !== null) return;
        Event.preventDefault();
        JoystickPointer = Event.pointerId;
        try { Joystick.setPointerCapture(Event.pointerId); } catch (Err) {}
        JoystickKnob.classList.add("Active");
        UpdateJoystickFromEvent(Event);
    });
    Joystick.addEventListener("pointermove", (Event) => {
        if (Event.pointerId !== JoystickPointer) return;
        Event.preventDefault();
        UpdateJoystickFromEvent(Event);
    });
    const EndJoystick = (Event) => {
        if (Event.pointerId !== JoystickPointer) return;
        ResetJoystick();
    };
    Joystick.addEventListener("pointerup", EndJoystick);
    Joystick.addEventListener("pointercancel", EndJoystick);
    Joystick.addEventListener("lostpointercapture", EndJoystick);
    Joystick.addEventListener("contextmenu", (Event) => Event.preventDefault());
}

function BindVerticalButton(Button, Direction) {
    if (!Button) return;
    Button.addEventListener("pointerdown", (Event) => {
        Event.preventDefault();
        VerticalPointers.set(Event.pointerId, Direction);
        try { Button.setPointerCapture(Event.pointerId); } catch (Err) {}
        Button.classList.add("Active");
    });
    const End = (Event) => {
        if (!VerticalPointers.has(Event.pointerId)) return;
        VerticalPointers.delete(Event.pointerId);
        let StillHeld = false;
        for (const D of VerticalPointers.values()) if (D === Direction) StillHeld = true;
        if (!StillHeld) Button.classList.remove("Active");
    };
    Button.addEventListener("pointerup", End);
    Button.addEventListener("pointercancel", End);
    Button.addEventListener("lostpointercapture", End);
    Button.addEventListener("contextmenu", (Event) => Event.preventDefault());
}

BindVerticalButton(TouchUpButton, 1);
BindVerticalButton(TouchDownButton, -1);

window.addEventListener("blur", () => {
    ResetJoystick();
    VerticalPointers.clear();
    if (TouchUpButton) TouchUpButton.classList.remove("Active");
    if (TouchDownButton) TouchDownButton.classList.remove("Active");
});

function GetVerticalInput() {
    let Sum = 0;
    for (const D of VerticalPointers.values()) Sum += D;
    return Math.max(-1, Math.min(1, Sum));
}

const UpdateCamera = () => {
    CurrentYaw += (TargetYaw - CurrentYaw) * 0.1;
    CurrentPitch += (TargetPitch - CurrentPitch) * 0.1;
    const Forward = GetCameraForward();
    const Right = [-Math.sin(CurrentYaw), 0, Math.cos(CurrentYaw)];
    let MX = 0, MY = 0, MZ = 0;
    if (!IsTextEntryFocused()) {
        if (KeyStates["KeyW"]) { MX += Forward[0] * CameraAcceleration; MY += Forward[1] * CameraAcceleration; MZ += Forward[2] * CameraAcceleration; }
        if (KeyStates["KeyS"]) { MX -= Forward[0] * CameraAcceleration; MY -= Forward[1] * CameraAcceleration; MZ -= Forward[2] * CameraAcceleration; }
        if (KeyStates["KeyD"]) { MX += Right[0] * CameraAcceleration; MY += Right[1] * CameraAcceleration; MZ += Right[2] * CameraAcceleration; }
        if (KeyStates["KeyA"]) { MX -= Right[0] * CameraAcceleration; MY -= Right[1] * CameraAcceleration; MZ -= Right[2] * CameraAcceleration; }
        if (KeyStates["Space"]) MY += CameraAcceleration;
        if (KeyStates["ShiftLeft"] || KeyStates["ShiftRight"]) MY -= CameraAcceleration;
    }

    JoystickSmoothed[0] += (JoystickInput[0] - JoystickSmoothed[0]) * 0.25;
    JoystickSmoothed[1] += (JoystickInput[1] - JoystickSmoothed[1]) * 0.25;
    VerticalSmoothed += (GetVerticalInput() - VerticalSmoothed) * 0.3;
    if (Math.abs(JoystickSmoothed[0]) < 0.001) JoystickSmoothed[0] = 0;
    if (Math.abs(JoystickSmoothed[1]) < 0.001) JoystickSmoothed[1] = 0;
    if (Math.abs(VerticalSmoothed) < 0.001) VerticalSmoothed = 0;

    const TouchScale = (typeof TouchSensitivity === "number" ? TouchSensitivity : 1);
    const Jx = JoystickSmoothed[0] * CameraAcceleration * TouchScale;
    const Jy = JoystickSmoothed[1] * CameraAcceleration * TouchScale;
    MX += Forward[0] * Jy + Right[0] * Jx;
    MY += Forward[1] * Jy + Right[1] * Jx;
    MZ += Forward[2] * Jy + Right[2] * Jx;
    MY += VerticalSmoothed * CameraAcceleration * (typeof TouchSensitivity === "number" ? TouchSensitivity : 1);

    CameraVelocity[0] = (CameraVelocity[0] + MX) * CameraDamping;
    CameraVelocity[1] = (CameraVelocity[1] + MY) * CameraDamping;
    CameraVelocity[2] = (CameraVelocity[2] + MZ) * CameraDamping;

    CanvasRenderer.CameraPosition[0] += CameraVelocity[0];
    CanvasRenderer.CameraPosition[1] += CameraVelocity[1];
    CanvasRenderer.CameraPosition[2] += CameraVelocity[2];

    CanvasRenderer.CameraTarget[0] = CanvasRenderer.CameraPosition[0] + Forward[0] * 100;
    CanvasRenderer.CameraTarget[1] = CanvasRenderer.CameraPosition[1] + Forward[1] * 100;
    CanvasRenderer.CameraTarget[2] = CanvasRenderer.CameraPosition[2] + Forward[2] * 100;
};

const TouchState = {
    Mode: null,
    LastX: 0,
    LastY: 0,
    PinchStartDist: 0,
    MoveThresholdExceeded: false,
    StartX: 0,
    StartY: 0,
    LongPressTimer: null
};

function ClearLongPress() {
    if (TouchState.LongPressTimer !== null) {
        clearTimeout(TouchState.LongPressTimer);
        TouchState.LongPressTimer = null;
    }
}

function StartDragOnAtom(AtomObj, ScreenX, ScreenY) {
    SelectedObject = AtomObj;
    CanvasRenderer.SelectedObject = SelectedObject;
    IsInteracting = true;
    const Forward = GetCameraForward();
    DragPlaneNormal = [-Forward[0], -Forward[1], -Forward[2]];
    DragPlanePoint = [...SelectedObject.Position];
    const Ray = GetScreenRay(ScreenX, ScreenY);
    const Intersection = RayPlaneIntersection(Ray.Origin, Ray.Direction, DragPlanePoint, DragPlaneNormal);
    if (Intersection) {
        InitialHitOffset = [
            SelectedObject.Position[0] - Intersection[0],
            SelectedObject.Position[1] - Intersection[1],
            SelectedObject.Position[2] - Intersection[2]
        ];
        LastDragPosition = [
            Intersection[0] + InitialHitOffset[0],
            Intersection[1] + InitialHitOffset[1],
            Intersection[2] + InitialHitOffset[2]
        ];
        LastDragTime = performance.now();
        ThrowVelocity = [0, 0, 0];
        DragSamples = [{ t: LastDragTime, p: [...LastDragPosition] }];
    }
}

if (IsTouchDevice) {
    Canvas.addEventListener("touchstart", (Event) => {
        HideContextMenu();
        ClosePanels();
        if (Event.touches.length === 1) {
            Event.preventDefault();
            const T = Event.touches[0];
            const Ray = GetScreenRay(T.clientX, T.clientY);
            const AtomHit = PickAtom(Ray);
            TouchState.MoveThresholdExceeded = false;
            TouchState.StartX = T.clientX;
            TouchState.StartY = T.clientY;
            ClearLongPress();
            if (AtomHit) {
                TouchState.Mode = "drag";
                StartDragOnAtom(AtomHit, T.clientX, T.clientY);
                TouchState.LongPressTimer = setTimeout(() => {
                    TouchState.LongPressTimer = null;
                    if (TouchState.Mode === "drag" && !TouchState.MoveThresholdExceeded) {
                        IsInteracting = false;
                        DragSamples = [];
                        TouchState.Mode = null;
                        ShowContextMenu(AtomHit, TouchState.StartX, TouchState.StartY);
                    }
                }, 550);
            } else {
                TouchState.Mode = "orbit";
                TouchState.LastX = T.clientX;
                TouchState.LastY = T.clientY;
                SelectedObject = null;
                CanvasRenderer.SelectedObject = null;
            }
        } else if (Event.touches.length === 2) {
            Event.preventDefault();
            ClearLongPress();
            if (TouchState.Mode === "drag") {
                IsInteracting = false;
                DragSamples = [];
            }
            TouchState.Mode = "pinch";
            const T1 = Event.touches[0], T2 = Event.touches[1];
            TouchState.PinchStartDist = Math.hypot(T2.clientX - T1.clientX, T2.clientY - T1.clientY);
        } else {
            Event.preventDefault();
        }
    }, { passive: false });

    Canvas.addEventListener("touchmove", (Event) => {
        if (TouchState.Mode === "orbit" && Event.touches.length === 1) {
            Event.preventDefault();
            const T = Event.touches[0];
            const DX = T.clientX - TouchState.LastX;
            const DY = T.clientY - TouchState.LastY;
            const TotalDX = T.clientX - TouchState.StartX;
            const TotalDY = T.clientY - TouchState.StartY;
            if (Math.abs(TotalDX) > 6 || Math.abs(TotalDY) > 6) TouchState.MoveThresholdExceeded = true;
            if (TouchState.MoveThresholdExceeded) {
                const Sensitivity = 0.006;
                TargetYaw += DX * Sensitivity;
                TargetPitch -= DY * Sensitivity;
                const PitchLimit = Math.PI / 2 - 0.01;
                TargetPitch = Math.max(-PitchLimit, Math.min(PitchLimit, TargetPitch));
            }
            TouchState.LastX = T.clientX;
            TouchState.LastY = T.clientY;
        } else if (TouchState.Mode === "pinch" && Event.touches.length === 2) {
            Event.preventDefault();
            const T1 = Event.touches[0], T2 = Event.touches[1];
            const Dist = Math.hypot(T2.clientX - T1.clientX, T2.clientY - T1.clientY);
            const Delta = TouchState.PinchStartDist - Dist;
            TouchState.PinchStartDist = Dist;
            const Forward = GetCameraForward();
            const ZoomSpeed = Math.max(-40, Math.min(40, Delta * 0.7));
            CameraVelocity[0] += Forward[0] * ZoomSpeed;
            CameraVelocity[1] += Forward[1] * ZoomSpeed;
            CameraVelocity[2] += Forward[2] * ZoomSpeed;
        } else if (TouchState.Mode === "drag" && Event.touches.length === 1 && SelectedObject) {
            Event.preventDefault();
            const T = Event.touches[0];
            if (!TouchState.MoveThresholdExceeded) {
                const Moved = Math.hypot(T.clientX - TouchState.StartX, T.clientY - TouchState.StartY);
                if (Moved < 8) return;
                TouchState.MoveThresholdExceeded = true;
                ClearLongPress();
            }
            const Ray = GetScreenRay(T.clientX, T.clientY);
            const Intersection = RayPlaneIntersection(Ray.Origin, Ray.Direction, DragPlanePoint, DragPlaneNormal);
            if (Intersection) {
                const CurrentTime = performance.now();
                const NewPos = [
                    Intersection[0] + InitialHitOffset[0],
                    Intersection[1] + InitialHitOffset[1],
                    Intersection[2] + InitialHitOffset[2]
                ];
                DragSamples.push({ t: CurrentTime, p: [...NewPos] });
                while (DragSamples.length > 0 && CurrentTime - DragSamples[0].t > DragSampleWindowMs * 2) {
                    DragSamples.shift();
                }
                SelectedObject.Position[0] = NewPos[0];
                SelectedObject.Position[1] = NewPos[1];
                SelectedObject.Position[2] = NewPos[2];
                SelectedObject.Velocity = [0, 0, 0];
                LastDragPosition = NewPos;
                LastDragTime = CurrentTime;
            }
        } else {
            Event.preventDefault();
        }
    }, { passive: false });

    Canvas.addEventListener("touchend", (Event) => {
        Event.preventDefault();
        ClearLongPress();
        if (TouchState.Mode === "drag" && SelectedObject) {
            const ThrowVel = ComputeThrowFromSamples();
            const Mag = Math.hypot(ThrowVel[0], ThrowVel[1], ThrowVel[2]);
            if (Mag > 0.35) SelectedObject.Velocity = [...ThrowVel];
        }
        if (Event.touches.length === 0) {
            TouchState.Mode = null;
            IsInteracting = false;
            DragSamples = [];
        }
    }, { passive: false });

    Canvas.addEventListener("touchcancel", () => {
        ClearLongPress();
        TouchState.Mode = null;
        IsInteracting = false;
        DragSamples = [];
    }, { passive: false });
}

const HierarchyTree = document.getElementById("HierarchyTree");
const HierarchyCollapseAllBtn = document.getElementById("HierarchyCollapseAll");
const HierarchyExpandAllBtn = document.getElementById("HierarchyExpandAll");
const HierarchyCollapsed = new Set();
let HierarchyForceMode = null;
let LastHierarchySignature = "";
let HierarchyPointerDown = false;

const Prefs = {
    ExciteAmount: 0.8,
    ImpulseStrength: 8,
    ShakeIntensity: 1.0,
    SpawnSpeed: 0.5,
    BoundX: 300,
    BoundY: 300,
    BoundZ: 300
};

HierarchyCollapsed.add("free_atoms");

function SyncHierarchyForceButtons() {
    if (HierarchyCollapseAllBtn) HierarchyCollapseAllBtn.classList.toggle("active", HierarchyForceMode === "collapse");
    if (HierarchyExpandAllBtn) HierarchyExpandAllBtn.classList.toggle("active", HierarchyForceMode === "expand");
}

function CollectAllGroupKeys() {
    const Groups = BuildMoleculeGroups();
    const Entries = [...Groups.entries()].sort((A, B) => {
        if (B[1].length !== A[1].length) return B[1].length - A[1].length;
        return FormulaFromIndices(A[1]).localeCompare(FormulaFromIndices(B[1]));
    });
    const Keys = [];
    let GroupIdx = 0;
    let FreeCount = 0;
    for (const [, Indices] of Entries) {
        if (Indices.length === 1) { FreeCount++; continue; }
        const Formula = FormulaFromIndices(Indices);
        Keys.push(`g${GroupIdx}_${Formula}_${Indices.length}`);
        GroupIdx++;
    }
    if (FreeCount > 0) Keys.push("free_atoms");
    return Keys;
}

function ApplyHierarchyForceMode() {
    if (HierarchyForceMode === "collapse") {
        HierarchyCollapsed.clear();
        for (const Key of CollectAllGroupKeys()) HierarchyCollapsed.add(Key);
    } else if (HierarchyForceMode === "expand") {
        HierarchyCollapsed.clear();
    }
}

function BuildMoleculeGroups() {
    const N = Objects.length;
    const Parent = Array.from({ length: N }, (_, i) => i);
    const Find = (i) => {
        while (Parent[i] !== i) { Parent[i] = Parent[Parent[i]]; i = Parent[i]; }
        return i;
    };
    const Union = (a, b) => {
        const Ra = Find(a), Rb = Find(b);
        if (Ra !== Rb) Parent[Rb] = Ra;
    };
    for (const Key of CanvasRenderer.ActiveBondPairs) {
        const [A, B] = Key.split("_").map(Number);
        if (A < N && B < N) Union(A, B);
    }
    const Groups = new Map();
    for (let i = 0; i < N; i++) {
        const Root = Find(i);
        if (!Groups.has(Root)) Groups.set(Root, []);
        Groups.get(Root).push(i);
    }
    return Groups;
}

function FormulaFromIndices(Indices) {
    const Counts = {};
    for (const i of Indices) {
        const K = Objects[i].Key;
        Counts[K] = (Counts[K] || 0) + 1;
    }
    const Keys = Object.keys(Counts).sort((A, B) => {
        if (A === "C") return -1;
        if (B === "C") return 1;
        if (A === "H") return -1;
        if (B === "H") return 1;
        return A.localeCompare(B);
    });
    return Keys.map((K) => Counts[K] > 1 ? `${K}${Counts[K]}` : K).join("");
}

function HierarchySignature(Entries) {
    return Entries.map(([, Idx]) => Idx.slice().sort((A, B) => A - B).join(",")).join("|")
        + `#${SelectedObject ? Objects.indexOf(SelectedObject) : -1}`
        + `#${[...HierarchyCollapsed].join(",")}`;
}

function SelectAtomByIndex(Index) {
    if (Index < 0 || Index >= Objects.length) return;
    const Atom = Objects[Index];
    SelectedObject = Atom;
    CanvasRenderer.SelectedObject = Atom;
    if (HierarchyTree) {
        HierarchyTree.querySelectorAll(".HierAtom").forEach((Row) => {
            const I = Number(Row.dataset.index);
            Row.classList.toggle("selected", I === Index);
        });
    }
}

function FocusAtomByIndex(Index) {
    SelectAtomByIndex(Index);
    const Atom = Objects[Index];
    if (!Atom) return;
    const Fwd = GetCameraForward();
    CanvasRenderer.CameraTarget = [...Atom.Position];
    CanvasRenderer.CameraPosition = [
        Atom.Position[0] - Fwd[0] * 350,
        Atom.Position[1] - Fwd[1] * 350,
        Atom.Position[2] - Fwd[2] * 350
    ];
}

function UpdateHierarchy(ForceRebuild = false) {
    if (!HierarchyTree) return;
    if (HierarchyPointerDown && !ForceRebuild) {
        HierarchyTree.querySelectorAll(".HierAtom").forEach((Row) => {
            const I = Number(Row.dataset.index);
            if (I >= 0 && I < Objects.length) {
                const Ke = Objects[I].KineticEnergy || 0;
                const KeEl = Row.querySelector(".HierAtomKe");
                if (KeEl) KeEl.textContent = Ke.toFixed(1);
                Row.classList.toggle("hot", Ke > 8 || (Objects[I].Excited || 0) > 0.3);
                Row.classList.toggle("excited", (Objects[I].Excited || 0) > 0.05);
            }
        });
        return;
    }
    const Groups = BuildMoleculeGroups();
    const Entries = [...Groups.entries()].sort((A, B) => {
        if (B[1].length !== A[1].length) return B[1].length - A[1].length;
        return FormulaFromIndices(A[1]).localeCompare(FormulaFromIndices(B[1]));
    });
    const Sig = HierarchySignature(Entries);
    const StructureChanged = ForceRebuild || Sig !== LastHierarchySignature;

    if (!StructureChanged) {
        HierarchyTree.querySelectorAll(".HierAtom").forEach((Row) => {
            const I = Number(Row.dataset.index);
            if (I >= 0 && I < Objects.length) {
                const Atom = Objects[I];
                const Ke = Atom.KineticEnergy || 0;
                const KeEl = Row.querySelector(".HierAtomKe");
                if (KeEl) KeEl.textContent = Ke.toFixed(1);
                Row.classList.toggle("selected", SelectedObject === Atom);
                Row.classList.toggle("hot", Ke > 8 || (Atom.Excited || 0) > 0.3);
                Row.classList.toggle("excited", (Atom.Excited || 0) > 0.05);
            }
        });
        HierarchyTree.querySelectorAll(".HierGroup").forEach((GroupEl) => {
            const Meta = GroupEl.querySelector(".HierGroupMeta");
            if (!Meta) return;
            const Indices = (GroupEl.dataset.indices || "").split(",").map(Number).filter((N) => !isNaN(N));
            let TotalKe = 0;
            for (const i of Indices) if (Objects[i]) TotalKe += Objects[i].KineticEnergy || 0;
            Meta.textContent = `${Indices.length} | KE ${TotalKe.toFixed(1)}`;
        });
        return;
    }

    LastHierarchySignature = Sig;
    if (HierarchyForceMode) ApplyHierarchyForceMode();
    const Fragments = [];
    let GroupIdx = 0;
    const FreeIndices = [];
    const MoleculeEntries = [];
    for (const [, Indices] of Entries) {
        if (Indices.length === 1) FreeIndices.push(Indices[0]);
        else MoleculeEntries.push(Indices);
    }

    const BuildGroup = (GroupKey, Label, Indices, Collapsible) => {
        let IsCollapsed = HierarchyCollapsed.has(GroupKey);
        if (HierarchyForceMode === "collapse") IsCollapsed = true;
        if (HierarchyForceMode === "expand") IsCollapsed = false;
        let TotalKe = 0;
        for (const i of Indices) TotalKe += Objects[i].KineticEnergy || 0;
        const GroupEl = document.createElement("div");
        GroupEl.className = "HierGroup";
        GroupEl.dataset.groupKey = GroupKey;
        GroupEl.dataset.indices = Indices.join(",");
        const Header = document.createElement("div");
        Header.className = "HierGroupHeader";
        Header.dataset.groupKey = GroupKey;
        Header.dataset.molecule = Collapsible ? "1" : "0";
        Header.innerHTML = `
            <span class="HierChevron">${Collapsible ? (IsCollapsed ? ">" : "v") : "*"}</span>
            <span class="HierGroupLabel">${Label}</span>
            <span class="HierGroupMeta">${Indices.length} | KE ${TotalKe.toFixed(1)}</span>
        `;
        GroupEl.appendChild(Header);
        const Children = document.createElement("div");
        Children.className = "HierChildren" + (IsCollapsed ? " collapsed" : "");
        for (const i of Indices) {
            const AtomObj = Objects[i];
            const Row = document.createElement("div");
            Row.className = "HierAtom";
            Row.dataset.index = String(i);
            if (SelectedObject === AtomObj) Row.classList.add("selected");
            if ((AtomObj.KineticEnergy || 0) > 8 || (AtomObj.Excited || 0) > 0.3) Row.classList.add("hot");
            if ((AtomObj.Excited || 0) > 0.05) Row.classList.add("excited");
            const MassNumber = (AtomObj.Protons || 0) + (AtomObj.Neutrons || 0);
            const UnstableMark = AtomObj.Stable ? "" : " *";
            const Charge = AtomObj.ExtraCharge || 0;
            const ChargeStr = Math.abs(Charge) > 0.05 ? ` [${Charge > 0 ? "+" : ""}${Charge.toFixed(1)}]` : "";
            Row.innerHTML = `
                <span class="HierAtomName">${AtomObj.Key}${ChargeStr} | ${AtomObj.Atom.Name || AtomObj.Key}${UnstableMark} (A=${MassNumber})</span>
                <span class="HierAtomKe">${(AtomObj.KineticEnergy || 0).toFixed(1)}</span>
            `;
            Children.appendChild(Row);
        }
        GroupEl.appendChild(Children);
        Fragments.push(GroupEl);
    };

    for (const Indices of MoleculeEntries) {
        const Formula = FormulaFromIndices(Indices);
        const GroupKey = `g${GroupIdx}_${Formula}_${Indices.length}`;
        BuildGroup(GroupKey, Formula, Indices, true);
        GroupIdx++;
    }
    if (FreeIndices.length > 0) {
        BuildGroup("free_atoms", `Free (${FreeIndices.length})`, FreeIndices, true);
    }
    HierarchyTree.replaceChildren(...Fragments);
}

if (HierarchyTree) {
    HierarchyTree.addEventListener("pointerdown", (E) => {
        HierarchyPointerDown = true;
        const AtomRow = E.target.closest(".HierAtom");
        if (AtomRow && AtomRow.dataset.index !== undefined) {
            E.preventDefault();
            E.stopPropagation();
            SelectAtomByIndex(Number(AtomRow.dataset.index));
        }
        const Header = E.target.closest(".HierGroupHeader");
        if (Header && Header.dataset.molecule === "1") {
            E.preventDefault();
            E.stopPropagation();
            HierarchyForceMode = null;
            SyncHierarchyForceButtons();
            const Key = Header.dataset.groupKey;
            if (HierarchyCollapsed.has(Key)) HierarchyCollapsed.delete(Key);
            else HierarchyCollapsed.add(Key);
            UpdateHierarchy(true);
        }
    });
    HierarchyTree.addEventListener("pointerup", () => { HierarchyPointerDown = false; });
    HierarchyTree.addEventListener("pointercancel", () => { HierarchyPointerDown = false; });
    HierarchyTree.addEventListener("pointerleave", () => { HierarchyPointerDown = false; });
    HierarchyTree.addEventListener("dblclick", (E) => {
        const AtomRow = E.target.closest(".HierAtom");
        if (AtomRow && AtomRow.dataset.index !== undefined) {
            E.preventDefault();
            FocusAtomByIndex(Number(AtomRow.dataset.index));
        }
    });
}

if (HierarchyCollapseAllBtn) {
    HierarchyCollapseAllBtn.addEventListener("click", (E) => {
        E.stopPropagation();
        HierarchyForceMode = HierarchyForceMode === "collapse" ? null : "collapse";
        ApplyHierarchyForceMode();
        SyncHierarchyForceButtons();
        UpdateHierarchy(true);
    });
}
if (HierarchyExpandAllBtn) {
    HierarchyExpandAllBtn.addEventListener("click", (E) => {
        E.stopPropagation();
        HierarchyForceMode = HierarchyForceMode === "expand" ? null : "expand";
        ApplyHierarchyForceMode();
        SyncHierarchyForceButtons();
        UpdateHierarchy(true);
    });
}
SyncHierarchyForceButtons();

const AtomSelect = document.getElementById("AtomSelect");
const SpawnAtomBtn = document.getElementById("SpawnAtomBtn");
const SpawnOptsBtn = document.getElementById("SpawnOptsBtn");
const SpawnMenu = document.getElementById("SpawnMenu");
const SpawnCountInput = document.getElementById("SpawnCount");
const SpawnPatternEl = document.getElementById("SpawnPattern");
const SpawnSpacingEl = document.getElementById("SpawnSpacing");
const SpawnSpacingVal = document.getElementById("SpawnSpacingVal");
const SpawnSpeedEl = document.getElementById("SpawnSpeed");
const SpawnSpeedVal = document.getElementById("SpawnSpeedVal");
const SpawnOriginEl = document.getElementById("SpawnOrigin");
const SpawnRandomVelEl = document.getElementById("SpawnRandomVel");
const SpawnChargeEl = document.getElementById("SpawnCharge");
const SpawnSettleEl = document.getElementById("SpawnSettle");

if (AtomSelect && typeof Atoms !== "undefined") {
    const Common = ["H","C","N","O","F","Na","Mg","Si","P","S","Cl","Fe","Cu","Zn","Br","I","Au","U"];
    const AllKeys = Object.keys(Atoms);
    const Ordered = [
        ...Common.filter((K) => Atoms[K]),
        ...AllKeys.filter((K) => !Common.includes(K))
    ];
    for (const Key of Ordered) {
        const Opt = document.createElement("option");
        Opt.value = Key;
        Opt.textContent = `${Key} - ${Atoms[Key].Name}`;
        AtomSelect.appendChild(Opt);
    }
    AtomSelect.value = "C";
}

const SpawnOpts = {
    Count: 1,
    Pattern: "cluster",
    Spacing: 40,
    Speed: 0.5,
    Origin: "camera",
    RandomVel: true,
    Charge: false,
    Settle: true
};

function ReadSpawnOpts() {
    if (SpawnCountInput) SpawnOpts.Count = Math.max(1, Math.min(40, Number(SpawnCountInput.value) || 1));
    if (SpawnPatternEl) SpawnOpts.Pattern = SpawnPatternEl.value || "cluster";
    if (SpawnSpacingEl) SpawnOpts.Spacing = Number(SpawnSpacingEl.value) || 40;
    if (SpawnSpeedEl) SpawnOpts.Speed = Number(SpawnSpeedEl.value) || 0;
    if (SpawnOriginEl) SpawnOpts.Origin = SpawnOriginEl.value || "camera";
    if (SpawnRandomVelEl) SpawnOpts.RandomVel = !!SpawnRandomVelEl.checked;
    if (SpawnChargeEl) SpawnOpts.Charge = !!SpawnChargeEl.checked;
    if (SpawnSettleEl) SpawnOpts.Settle = !!SpawnSettleEl.checked;
    Prefs.SpawnSpeed = SpawnOpts.Speed;
}

if (SpawnSpacingEl) {
    SpawnSpacingEl.addEventListener("input", () => {
        if (SpawnSpacingVal) SpawnSpacingVal.textContent = String(SpawnSpacingEl.value);
    });
}
if (SpawnSpeedEl) {
    SpawnSpeedEl.addEventListener("input", () => {
        if (SpawnSpeedVal) SpawnSpeedVal.textContent = Number(SpawnSpeedEl.value).toFixed(1);
        Prefs.SpawnSpeed = Number(SpawnSpeedEl.value) || 0;
    });
}

function CloseSpawnMenu() {
    if (SpawnMenu) SpawnMenu.hidden = true;
    if (SpawnOptsBtn) SpawnOptsBtn.setAttribute("aria-expanded", "false");
}

function PositionSpawnMenu() {
    if (!SpawnMenu || !SpawnOptsBtn || SpawnMenu.hidden) return;
    const Rect = SpawnOptsBtn.getBoundingClientRect();
    const MenuW = Math.min(280, window.innerWidth - 16);
    let Left = Rect.right - MenuW;
    Left = Math.max(8, Math.min(Left, window.innerWidth - MenuW - 8));
    let Top = Rect.bottom + 6;
    SpawnMenu.style.left = `${Left}px`;
    SpawnMenu.style.top = `${Top}px`;
    const Mr = SpawnMenu.getBoundingClientRect();
    if (Mr.bottom > window.innerHeight - 8) {
        Top = Math.max(8, Rect.top - Mr.height - 6);
        SpawnMenu.style.top = `${Top}px`;
    }
}

if (SpawnOptsBtn && SpawnMenu) {
    SpawnOptsBtn.addEventListener("click", (Event) => {
        Event.stopPropagation();
        const Open = SpawnMenu.hidden;
        SpawnMenu.hidden = !Open;
        SpawnOptsBtn.setAttribute("aria-expanded", Open ? "true" : "false");
        if (Open) {
            HideContextMenu();
            PositionSpawnMenu();
        }
    });
    SpawnMenu.addEventListener("mousedown", (Event) => Event.stopPropagation());
    SpawnMenu.addEventListener("click", (Event) => Event.stopPropagation());
    document.addEventListener("mousedown", (Event) => {
        if (!SpawnMenu.hidden && !Event.target.closest("#SpawnMenu, #SpawnOptsBtn")) {
            CloseSpawnMenu();
        }
    });
    window.addEventListener("resize", () => PositionSpawnMenu());
}

function SpawnAnchor() {
    const Cam = CanvasRenderer.CameraPosition;
    const Fwd = GetCameraForward();
    const Mode = SpawnOpts.Origin;
    if (Mode === "origin") return [0, 0, 0];
    if (Mode === "selected" && SelectedObject) {
        return [...SelectedObject.Position];
    }
    return [Cam[0] + Fwd[0] * 260, Cam[1] + Fwd[1] * 260, Cam[2] + Fwd[2] * 260];
}

function SpawnOffset(I, Count, Spacing, Pattern) {
    if (Count <= 1) return [0, 0, 0];
    if (Pattern === "line") {
        return [(I - (Count - 1) * 0.5) * Spacing, 0, 0];
    }
    if (Pattern === "ring") {
        const Ang = (I / Count) * Math.PI * 2;
        return [Math.cos(Ang) * Spacing, 0, Math.sin(Ang) * Spacing];
    }
    if (Pattern === "grid") {
        const Side = Math.ceil(Math.sqrt(Count));
        const X = (I % Side) - (Side - 1) * 0.5;
        const Z = Math.floor(I / Side) - (Side - 1) * 0.5;
        return [X * Spacing, 0, Z * Spacing];
    }
    if (Pattern === "scatter") {
        return [
            (Math.random() - 0.5) * Spacing * 3,
            (Math.random() - 0.5) * Spacing * 3,
            (Math.random() - 0.5) * Spacing * 3
        ];
    }
    // cluster
    return [
        (Math.random() - 0.5) * Spacing * 0.7,
        (Math.random() - 0.5) * Spacing * 0.7,
        (Math.random() - 0.5) * Spacing * 0.7
    ];
}

function SpawnAtoms() {
    if (!AtomSelect || typeof Atom !== "function") return;
    ReadSpawnOpts();
    const Key = AtomSelect.value;
    const Count = SpawnOpts.Count;
    const Speed = SpawnOpts.Speed;
    if (!CanvasRenderer) return;
    const Center = SpawnAnchor();
    let Last = null;
    for (let I = 0; I < Count; I++) {
        const Off = SpawnOffset(I, Count, SpawnOpts.Spacing, SpawnOpts.Pattern);
        const Vel = SpawnOpts.RandomVel
            ? [(Math.random() - 0.5) * Speed, (Math.random() - 0.5) * Speed, (Math.random() - 0.5) * Speed]
            : [0, 0, 0];
        Last = Atom(Key, [
            Center[0] + Off[0],
            Center[1] + Off[1],
            Center[2] + Off[2]
        ], Vel);
        if (Last && SpawnOpts.Charge) Last.ExtraCharge = (Last.ExtraCharge || 0) + 1;
    }
    if (Last) {
        SelectedObject = Last;
        CanvasRenderer.SelectedObject = Last;
    }
    if (SpawnOpts.Settle) {
        CanvasRenderer.SettleFrames = Math.max(CanvasRenderer.SettleFrames || 0, 90);
        CanvasRenderer.BondsDirty = true;
    }
    UpdateHierarchy(true);
}

if (SpawnAtomBtn) {
    SpawnAtomBtn.addEventListener("click", (E) => {
        E.stopPropagation();
        SpawnAtoms();
    });
}

function WirePref(Id, Key, Format = (V) => V.toFixed(1)) {
    const El = document.getElementById(Id);
    const Val = document.getElementById(Id + "Val");
    if (!El) return;
    El.addEventListener("input", () => {
        const V = Number(El.value);
        Prefs[Key] = V;
        if (Val) Val.textContent = Format(V);
        if (Key === "ShakeIntensity" && CanvasRenderer) CanvasRenderer.ShakeIntensity = V;
    });
}
WirePref("PrefExcite", "ExciteAmount");
WirePref("PrefImpulse", "ImpulseStrength", (V) => String(V));
WirePref("PrefShake", "ShakeIntensity");

function WireBound(Id, Axis) {
    const El = document.getElementById(Id);
    if (!El) return;
    const Apply = () => {
        let V = Number(El.value);
        if (!isFinite(V) || El.value === "") {
            V = Prefs["Bound" + Axis] ?? 300;
        }
        V = Math.max(100, Math.min(1500, Math.round(V / 25) * 25 || 300));
        El.value = String(V);
        Prefs["Bound" + Axis] = V;
        if (CanvasRenderer) CanvasRenderer["Boundary" + Axis] = V;
        if (BoundsSizeLabel && CanvasRenderer) {
            BoundsSizeLabel.textContent = `${Math.round(CanvasRenderer.BoundaryX)}/${Math.round(CanvasRenderer.BoundaryY)}/${Math.round(CanvasRenderer.BoundaryZ)}`;
        }
    };
    // Keep fields populated from Prefs / renderer
    const Initial = Prefs["Bound" + Axis] ?? (CanvasRenderer ? CanvasRenderer["Boundary" + Axis] : 300) ?? 300;
    El.value = String(Math.round(Initial));
    El.addEventListener("change", Apply);
    El.addEventListener("blur", Apply);
    El.addEventListener("keydown", (Event) => {
        if (Event.key === "Enter") {
            Event.preventDefault();
            Apply();
            El.blur();
        }
        Event.stopPropagation();
    });
}
WireBound("PrefBoundX", "X");
WireBound("PrefBoundY", "Y");
WireBound("PrefBoundZ", "Z");

// Re-sync bound fields once renderer is ready
const _PrevBoot = BootRenderer;
// note: BootRenderer already ran as promise - sync after a microtask if renderer exists
queueMicrotask(() => {
    for (const [Id, Axis] of [["PrefBoundX", "X"], ["PrefBoundY", "Y"], ["PrefBoundZ", "Z"]]) {
        const El = document.getElementById(Id);
        if (!El) continue;
        const V = (CanvasRenderer && CanvasRenderer["Boundary" + Axis]) || Prefs["Bound" + Axis] || 300;
        El.value = String(Math.round(V));
    }
});

const PrefBathEl = document.getElementById("PrefBath");
if (PrefBathEl) {
    PrefBathEl.addEventListener("input", () => {
        const V = Number(PrefBathEl.value);
        if (!CanvasRenderer) return;
        CanvasRenderer.Temperature = V;
        const Val = document.getElementById("PrefBathVal");
        if (Val) Val.textContent = V.toFixed(2);
        if (BathTempLabel) BathTempLabel.textContent = V.toFixed(2);
    });
}

const PrefFreeEl = document.getElementById("PrefFreeEnergy");
if (PrefFreeEl) {
    PrefFreeEl.addEventListener("input", () => {
        const V = Number(PrefFreeEl.value);
        if (!CanvasRenderer) return;
        CanvasRenderer.FreeEnergy = V;
        const Val = document.getElementById("PrefFreeEnergyVal");
        if (Val) Val.textContent = V.toFixed(1);
    });
}

const PrefFrictionEl = document.getElementById("PrefFriction");
if (PrefFrictionEl) {
    PrefFrictionEl.addEventListener("input", () => {
        const V = Number(PrefFrictionEl.value);
        if (!CanvasRenderer) return;
        CanvasRenderer.Friction = Math.max(0, Math.min(1, V));
        const Val = document.getElementById("PrefFrictionVal");
        if (Val) Val.textContent = V.toFixed(2);
    });
}


let LastFrameTime = performance.now();
let FrameCounter = 0;
let FpsTimer = 0;

const Update = () => {
    if (!CanvasRenderer) {
        requestAnimationFrame(Update);
        return;
    }
    const Now = performance.now();
    const DeltaTime = Now - LastFrameTime;
    LastFrameTime = Now;
    FrameCounter++;
    FpsTimer += DeltaTime;

    if (DeltaTimeLabel) DeltaTimeLabel.textContent = `${DeltaTime.toFixed(3)}ms`;
    if (TimeScaleLabel) {
        const Ts = CanvasRenderer.TargetTimeScale;
        TimeScaleLabel.textContent = Ts <= 0 ? "PAUSED" : `${Ts.toFixed(2)}x`;
    }
    if (TemperatureLabel) {
        let SumKe = 0;
        for (const O of Objects) SumKe += O.KineticEnergy || 0;
        const AvgKe = Objects.length > 0 ? SumKe / Objects.length : 0;
        TemperatureLabel.textContent = (AvgKe * 0.12).toFixed(2);
    }
    if (BathTempLabel) BathTempLabel.textContent = CanvasRenderer.Temperature.toFixed(2);
    if (BoundsSizeLabel) {
        BoundsSizeLabel.textContent =
            `${Math.round(CanvasRenderer.BoundaryX)}/${Math.round(CanvasRenderer.BoundaryY)}/${Math.round(CanvasRenderer.BoundaryZ)}`;
    }
    if (FpsTimer >= 1000) {
        const Fps = Math.round((FrameCounter * 1000) / FpsTimer);
        if (FramerateLabel) FramerateLabel.textContent = `${String(Fps).padStart(3, "0")}/s`;
        FrameCounter = 0;
        FpsTimer = 0;
    }

    CanvasRenderer.DraggedObject = (IsInteracting && SelectedObject) ? SelectedObject : null;

    UpdateHierarchy();
    UpdateCamera();
    CanvasRenderer.Render();

    if (globalThis.Plugin) globalThis.Plugin.Tick(DeltaTime);
    requestAnimationFrame(Update);
};

function MakeStepArrow(Dir) {
    const Svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Svg.setAttribute("viewBox", "0 0 12 8");
    Svg.setAttribute("width", "10");
    Svg.setAttribute("height", "6");
    Svg.setAttribute("aria-hidden", "true");
    Svg.classList.add("NumStepSvg");
    const Path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    // Up: point top, Down: point bottom
    Path.setAttribute("d", Dir > 0 ? "M1 6.5 L6 1.5 L11 6.5" : "M1 1.5 L6 6.5 L11 1.5");
    Path.setAttribute("fill", "none");
    Path.setAttribute("stroke", "currentColor");
    Path.setAttribute("stroke-width", "1.6");
    Path.setAttribute("stroke-linecap", "round");
    Path.setAttribute("stroke-linejoin", "round");
    Svg.appendChild(Path);
    return Svg;
}

function EnhanceNumberFields(Root = document) {
    const Candidates = Root.querySelectorAll('input[type="number"]');
    for (const Input of Candidates) {
        if (Input.closest(".WStepper")) continue; // already has +/- buttons
        if (Input.dataset.stepperWired === "1") continue;

        let Field = Input.closest(".NumField");
        if (!Field) {
            Field = document.createElement("div");
            Field.className = "NumField";
            Input.parentNode.insertBefore(Field, Input);
            Field.appendChild(Input);
        }
        if (Field.dataset.stepperWired === "1") {
            Input.dataset.stepperWired = "1";
            continue;
        }
        Field.dataset.stepperWired = "1";
        Input.dataset.stepperWired = "1";

        const Stepper = document.createElement("div");
        Stepper.className = "NumStepper";

        const MkBtn = (Dir) => {
            const Btn = document.createElement("button");
            Btn.type = "button";
            Btn.className = "NumStepBtn " + (Dir > 0 ? "NumStepUp" : "NumStepDown");
            Btn.tabIndex = -1;
            Btn.setAttribute("aria-label", Dir > 0 ? "Increase" : "Decrease");
            Btn.appendChild(MakeStepArrow(Dir));
            Btn.addEventListener("mousedown", (Event) => {
                Event.preventDefault();
                Event.stopPropagation();
            });
            Btn.addEventListener("click", (Event) => {
                Event.preventDefault();
                Event.stopPropagation();
                const Step = Number(Input.step);
                const StepVal = isFinite(Step) && Step !== 0 ? Step : 1;
                const Min = Input.min !== "" ? Number(Input.min) : -Infinity;
                const Max = Input.max !== "" ? Number(Input.max) : Infinity;
                let V = Number(Input.value);
                if (!isFinite(V)) V = isFinite(Min) ? Min : 0;
                V = V + Dir * StepVal;
                // snap
                const Precision = Math.max(0, (String(StepVal).split(".")[1] || "").length);
                const Scale = Math.pow(10, Precision);
                V = Math.round(V * Scale / (StepVal * Scale)) * StepVal;
                if (Precision > 0) V = Number(V.toFixed(Precision));
                else V = Math.round(V);
                V = Math.max(Min, Math.min(Max, V));
                Input.value = String(V);
                Input.dispatchEvent(new Event("input", { bubbles: true }));
                Input.dispatchEvent(new Event("change", { bubbles: true }));
            });
            return Btn;
        };

        Stepper.appendChild(MkBtn(1));
        Stepper.appendChild(MkBtn(-1));
        Field.appendChild(Stepper);
    }
}

EnhanceNumberFields();
if (typeof MutationObserver !== "undefined") {
    const NumObs = new MutationObserver(() => {
        EnhanceNumberFields(document);
    });
    NumObs.observe(document.body, { childList: true, subtree: true });
}