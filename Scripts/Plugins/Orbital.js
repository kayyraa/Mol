(function OrbitalPlugin() {
    const ORBITAL_TABLE = [
        { Id: "1s", n: 1, l: 0, m: 0, Label: "1s" },
        { Id: "2s", n: 2, l: 0, m: 0, Label: "2s" },
        { Id: "2px", n: 2, l: 1, m: 1, Label: "2p_x", Axis: "x" },
        { Id: "2py", n: 2, l: 1, m: -1, Label: "2p_y", Axis: "y" },
        { Id: "2pz", n: 2, l: 1, m: 0, Label: "2p_z", Axis: "z" },
        { Id: "3s", n: 3, l: 0, m: 0, Label: "3s" },
        { Id: "3pz", n: 3, l: 1, m: 0, Label: "3p_z", Axis: "z" },
        { Id: "3dz2", n: 3, l: 2, m: 0, Label: "3d_z2" },
        { Id: "3dxz", n: 3, l: 2, m: 1, Label: "3d_xz", Axis: "xz" },
        { Id: "3dyz", n: 3, l: 2, m: -1, Label: "3d_yz", Axis: "yz" },
        { Id: "3dxy", n: 3, l: 2, m: 2, Label: "3d_xy", Axis: "xy" },
        { Id: "3dx2y2", n: 3, l: 2, m: -2, Label: "3d_x2-y2" }
    ];

    function Factorial(N) {
        let R = 1;
        for (let I = 2; I <= N; I++) R *= I;
        return R;
    }

    function AssociatedLegendre(L, M, X) {
        const AM = Math.abs(M);
        if (AM > L) return 0;
        let Pmm = 1;
        if (AM > 0) {
            const Somx2 = Math.sqrt(Math.max(0, 1 - X * X));
            let Fact = 1;
            for (let I = 1; I <= AM; I++) {
                Pmm *= -Fact * Somx2;
                Fact += 2;
            }
        }
        if (L === AM) return Pmm;
        let Pmmp1 = X * (2 * AM + 1) * Pmm;
        if (L === AM + 1) return Pmmp1;
        let Pll = 0;
        for (let Ll = AM + 2; Ll <= L; Ll++) {
            Pll = ((2 * Ll - 1) * X * Pmmp1 - (Ll + AM - 1) * Pmm) / (Ll - AM);
            Pmm = Pmmp1;
            Pmmp1 = Pll;
        }
        return Pll;
    }

    function SphericalHarmonic(L, M, Theta, Phi) {
        const AM = Math.abs(M);
        const Norm = Math.sqrt(
            ((2 * L + 1) / (4 * Math.PI)) *
            (Factorial(L - AM) / Math.max(1, Factorial(L + AM)))
        );
        const Plm = AssociatedLegendre(L, AM, Math.cos(Theta));
        let Y = Norm * Plm;
        if (M > 0) Y *= Math.SQRT2 * Math.cos(M * Phi);
        else if (M < 0) Y *= Math.SQRT2 * Math.sin(AM * Phi);
        return Y;
    }

    function Laguerre(N, Alpha, X) {
        let L0 = 1;
        if (N === 0) return L0;
        let L1 = 1 + Alpha - X;
        if (N === 1) return L1;
        for (let K = 2; K <= N; K++) {
            const Lk = ((2 * K - 1 + Alpha - X) * L1 - (K - 1 + Alpha) * L0) / K;
            L0 = L1;
            L1 = Lk;
        }
        return L1;
    }

    function RadialR(N, L, Rho) {
        if (Rho <= 0) return N === 1 && L === 0 ? 2 : 0;
        const A = 2 / N;
        const Norm = Math.sqrt(
            (Math.pow(A, 3) * Factorial(N - L - 1)) /
            (2 * N * Math.pow(Factorial(N + L), 3) + 1e-12)
        );
        const RhoVal = A * Rho;
        return Norm * Math.exp(-RhoVal / 2) * Math.pow(RhoVal, L) * Laguerre(N - L - 1, 2 * L + 1, RhoVal);
    }

    function WaveDensity(N, L, M, X, Y, Z, Zeff) {
        const R = Math.sqrt(X * X + Y * Y + Z * Z) + 1e-9;
        const Rho = R * Zeff;
        const Theta = Math.acos(Math.max(-1, Math.min(1, Z / R)));
        const Phi = Math.atan2(Y, X);
        const Radial = RadialR(N, L, Rho);
        const Angular = SphericalHarmonic(L, M, Theta, Phi);
        const Psi = Radial * Angular * Math.pow(Zeff, 1.5);
        return Psi * Psi;
    }

    function PickDefaultOrbital(Atom) {
        if (!Atom) return "1s";
        const Z = Atom.Protons || Atom.Atom?.AtomicNumber || 1;
        if (Z <= 2) return "1s";
        if (Z <= 4) return "2s";
        if (Z <= 10) return "2pz";
        if (Z <= 12) return "3s";
        if (Z <= 18) return "3pz";
        if (Z <= 20) return "3s";
        return "3dz2";
    }

    function SampleOrbital(Orb, Zeff, Count) {
        const Points = [];
        const N = Orb.n;
        const Extent = (N * N * 3.2) / Math.max(0.4, Zeff);
        const MaxTries = Count * 40;
        let Tries = 0;
        let Accepted = 0;
        let MaxDens = 0;

        const Probe = Math.min(2500, Count * 3);
        for (let I = 0; I < Probe; I++) {
            const U = Math.random();
            const V = Math.random();
            const W = Math.random();
            const R = Extent * Math.pow(U, 0.55);
            const Theta = Math.acos(2 * V - 1);
            const Phi = 2 * Math.PI * W;
            const X = R * Math.sin(Theta) * Math.cos(Phi);
            const Y = R * Math.sin(Theta) * Math.sin(Phi);
            const Z = R * Math.cos(Theta);
            const D = WaveDensity(Orb.n, Orb.l, Orb.m, X, Y, Z, Zeff);
            if (D > MaxDens) MaxDens = D;
        }
        MaxDens = Math.max(MaxDens, 1e-12);

        while (Accepted < Count && Tries < MaxTries) {
            Tries++;
            const U = Math.random();
            const V = Math.random();
            const W = Math.random();
            const R = Extent * Math.pow(U, 0.55);
            const Theta = Math.acos(2 * V - 1);
            const Phi = 2 * Math.PI * W;
            const X = R * Math.sin(Theta) * Math.cos(Phi);
            const Y = R * Math.sin(Theta) * Math.sin(Phi);
            const Z = R * Math.cos(Theta);
            const D = WaveDensity(Orb.n, Orb.l, Orb.m, X, Y, Z, Zeff);
            if (Math.random() * MaxDens > D) continue;

            const Sign = (function () {
                const Rho = R * Zeff;
                const Radial = RadialR(Orb.n, Orb.l, Rho);
                const Angular = SphericalHarmonic(Orb.l, Orb.m, Theta, Phi);
                return Radial * Angular >= 0 ? 1 : -1;
            })();

            Points.push({
                X, Y, Z,
                W: D / MaxDens,
                S: Sign
            });
            Accepted++;
        }
        return { Points, Extent, MaxDens };
    }

    function OpenWidget(Api) {
        const State = {
            OrbitalId: "1s",
            PointCount: 8000,
            Yaw: 0.55,
            Pitch: 0.35,
            Zoom: 1,
            Dragging: false,
            LastX: 0,
            LastY: 0,
            LastSig: "",
            Cloud: null,
            Zeff: 1,
            AtomKey: "-",
            AutoPick: true
        };

        Api.CreateWidget({
            Id: "orbital",
            Title: "Orbital",
            X: 300,
            Y: 320,
            Width: 360,
            Build(Body) {
                const Info = Api.AddSection(Body, "Selected Atom", true);
                const ElementVal = Api.AddStatRow(Info, "Element");
                const ConfigVal = Api.AddStatRow(Info, "Config");
                const ZeffVal = Api.AddStatRow(Info, "Z_eff");
                const OrbVal = Api.AddStatRow(Info, "Orbital");

                const Controls = Api.AddSection(Body, "Orbital", true);
                const TypeRow = document.createElement("div");
                TypeRow.className = "WRow";
                TypeRow.innerHTML = `<label>Type</label>`;
                const TypeSel = document.createElement("select");
                TypeSel.className = "WSelect";
                for (const O of ORBITAL_TABLE) {
                    const Opt = document.createElement("option");
                    Opt.value = O.Id;
                    Opt.textContent = O.Label;
                    TypeSel.appendChild(Opt);
                }
                TypeSel.value = State.OrbitalId;
                TypeRow.appendChild(TypeSel);
                Controls.appendChild(TypeRow);

                const DensityRow = document.createElement("div");
                DensityRow.className = "WRow";
                DensityRow.innerHTML = `<label>Points</label>`;
                const DensityInput = document.createElement("input");
                DensityInput.type = "range";
                DensityInput.className = "WRange";
                DensityInput.min = "2000";
                DensityInput.max = "20000";
                DensityInput.step = "500";
                DensityInput.value = String(State.PointCount);
                const DensityVal = document.createElement("span");
                DensityVal.className = "WHint";
                DensityVal.style.minWidth = "40px";
                DensityVal.style.textAlign = "right";
                DensityVal.textContent = String(State.PointCount);
                DensityRow.appendChild(DensityInput);
                DensityRow.appendChild(DensityVal);
                Controls.appendChild(DensityRow);

                const AutoRow = document.createElement("div");
                AutoRow.className = "WRow";
                const AutoLabel = document.createElement("label");
                AutoLabel.className = "WCheck";
                const AutoInput = document.createElement("input");
                AutoInput.type = "checkbox";
                AutoInput.checked = true;
                AutoLabel.appendChild(AutoInput);
                AutoLabel.appendChild(document.createTextNode("Auto orbital from atom"));
                AutoRow.appendChild(AutoLabel);
                Controls.appendChild(AutoRow);

                const ViewSection = Api.AddSection(Body, "3D Orbital", true);
                const Canvas = document.createElement("canvas");
                Canvas.className = "WGraph";
                const ViewSize = 512;
                Canvas.width = ViewSize;
                Canvas.height = ViewSize;
                Canvas.style.width = "100%";
                Canvas.style.maxWidth = "320px";
                Canvas.style.aspectRatio = "1 / 1";
                Canvas.style.height = "auto";
                Canvas.style.display = "block";
                Canvas.style.margin = "0 auto";
                Canvas.style.cursor = "grab";
                Canvas.style.touchAction = "none";
                Canvas.style.userSelect = "none";
                Canvas.style.imageRendering = "pixelated";
                ViewSection.appendChild(Canvas);
                const Ctx = Canvas.getContext("2d", { alpha: false });
                Ctx.imageSmoothingEnabled = false;

                const Hint = document.createElement("div");
                Hint.className = "WHint";
                Hint.textContent = "Drag to rotate | scroll to zoom | phase lobes colored +/-";
                ViewSection.appendChild(Hint);

                function CurrentOrbital() {
                    return ORBITAL_TABLE.find((O) => O.Id === State.OrbitalId) || ORBITAL_TABLE[0];
                }

                function RebuildCloud() {
                    const Orb = CurrentOrbital();
                    State.Cloud = SampleOrbital(Orb, State.Zeff, State.PointCount);
                    State.LastSig = `${State.AtomKey}|${State.OrbitalId}|${State.PointCount}|${State.Zeff.toFixed(2)}`;
                    OrbVal.textContent = Orb.Label;
                    ZeffVal.textContent = State.Zeff.toFixed(2);
                }

                function Project(X, Y, Z) {
                    const Cy = Math.cos(State.Yaw), Sy = Math.sin(State.Yaw);
                    const Cp = Math.cos(State.Pitch), Sp = Math.sin(State.Pitch);
                    const X1 = X * Cy - Z * Sy;
                    const Z1 = X * Sy + Z * Cy;
                    const Y2 = Y * Cp - Z1 * Sp;
                    const Z2 = Y * Sp + Z1 * Cp;
                    const Extent = (State.Cloud && State.Cloud.Extent) || 4;
                    const Scale = (Math.min(Canvas.width, Canvas.height) * 0.38 * State.Zoom) / Extent;
                    return {
                        X: Canvas.width * 0.5 + X1 * Scale,
                        Y: Canvas.height * 0.5 - Y2 * Scale,
                        Z: Z2,
                        S: Scale
                    };
                }

                function Draw() {
                    const W = Canvas.width, H = Canvas.height;
                    const Img = Ctx.createImageData(W, H);
                    const Data = Img.data;
                    const Len = W * H;
                    for (let I = 0; I < Len; I++) {
                        const O = I * 4;
                        Data[O] = 8;
                        Data[O + 1] = 10;
                        Data[O + 2] = 14;
                        Data[O + 3] = 255;
                    }

                    if (!State.Cloud || !State.Cloud.Points.length) {
                        Ctx.putImageData(Img, 0, 0);
                        Ctx.fillStyle = "rgba(255,255,255,0.4)";
                        Ctx.font = "16px 'Cascadia Mono', monospace";
                        Ctx.textAlign = "center";
                        Ctx.textBaseline = "middle";
                        Ctx.fillText("Select an atom", W / 2, H / 2);
                        Ctx.textAlign = "left";
                        return;
                    }

                    const Cy = Math.cos(State.Yaw), Sy = Math.sin(State.Yaw);
                    const Cp = Math.cos(State.Pitch), Sp = Math.sin(State.Pitch);
                    const Extent = State.Cloud.Extent || 4;
                    const Scale = (Math.min(W, H) * 0.38 * State.Zoom) / Extent;
                    const Cx = W * 0.5;
                    const CyPix = H * 0.5;
                    const Points = State.Cloud.Points;
                    const N = Points.length;

                    for (let I = 0; I < N; I++) {
                        const P = Points[I];
                        const X1 = P.X * Cy - P.Z * Sy;
                        const Z1 = P.X * Sy + P.Z * Cy;
                        const Y2 = P.Y * Cp - Z1 * Sp;
                        const Sx = (Cx + X1 * Scale) | 0;
                        const SyPix = (CyPix - Y2 * Scale) | 0;
                        if ((Sx | SyPix) < 0 || Sx >= W || SyPix >= H) continue;

                        const O = (SyPix * W + Sx) * 4;
                        const T = 0.4 + P.W * 0.6;
                        let R, G, B;
                        if (P.S >= 0) {
                            R = 48 + P.W * 80;
                            G = 150 + P.W * 70;
                            B = 220 + P.W * 35;
                        } else {
                            R = 220 + P.W * 35;
                            G = 70 + P.W * 40;
                            B = 95 + P.W * 40;
                        }
                        Data[O] = (Data[O] * (1 - T) + R * T) | 0;
                        Data[O + 1] = (Data[O + 1] * (1 - T) + G * T) | 0;
                        Data[O + 2] = (Data[O + 2] * (1 - T) + B * T) | 0;
                    }

                    Ctx.putImageData(Img, 0, 0);

                    Ctx.strokeStyle = "rgba(255,255,255,0.12)";
                    Ctx.lineWidth = 1;
                    const AxisLen = Extent * 0.85;
                    const O = Project(0, 0, 0);
                    const Ax = Project(AxisLen, 0, 0);
                    const Ay = Project(0, AxisLen, 0);
                    const Az = Project(0, 0, AxisLen);
                    Ctx.beginPath(); Ctx.moveTo(O.X, O.Y); Ctx.lineTo(Ax.X, Ax.Y); Ctx.stroke();
                    Ctx.beginPath(); Ctx.moveTo(O.X, O.Y); Ctx.lineTo(Ay.X, Ay.Y); Ctx.stroke();
                    Ctx.beginPath(); Ctx.moveTo(O.X, O.Y); Ctx.lineTo(Az.X, Az.Y); Ctx.stroke();
                    Ctx.font = "11px 'Cascadia Mono', monospace";
                    Ctx.fillStyle = "rgba(255,120,120,0.6)";
                    Ctx.fillText("x", Ax.X + 4, Ax.Y);
                    Ctx.fillStyle = "rgba(120,255,140,0.6)";
                    Ctx.fillText("y", Ay.X + 4, Ay.Y);
                    Ctx.fillStyle = "rgba(120,160,255,0.6)";
                    Ctx.fillText("z", Az.X + 4, Az.Y);

                    Ctx.fillStyle = "rgba(255,255,255,0.95)";
                    Ctx.fillRect((O.X | 0) - 1, (O.Y | 0) - 1, 3, 3);

                    const Orb = CurrentOrbital();
                    Ctx.fillStyle = "rgba(255,255,255,0.5)";
                    Ctx.font = "12px 'Cascadia Mono', monospace";
                    Ctx.textAlign = "left";
                    Ctx.textBaseline = "top";
                    Ctx.fillText(`${State.AtomKey}  ${Orb.Label}`, 10, 10);
                    Ctx.fillStyle = "rgba(64,180,255,0.75)";
                    Ctx.fillText("+ phase", 10, 28);
                    Ctx.fillStyle = "rgba(255,90,110,0.75)";
                    Ctx.fillText("- phase", 10, 44);
                }

                function SyncFromAtom() {
                    const Atom = Api.GetSelectedAtom();
                    if (!Atom) {
                        ElementVal.textContent = "-";
                        ConfigVal.textContent = "-";
                        if (State.AtomKey !== "-") {
                            State.AtomKey = "-";
                            State.Cloud = null;
                            State.LastSig = "";
                        }
                        Draw();
                        return;
                    }

                    const Key = Atom.Key || "?";
                    const Z = Atom.Protons || Atom.Atom?.AtomicNumber || 1;
                    const Chem = globalThis.Chemistry;
                    const Config = Chem && Chem.GetElectronConfig ? Chem.GetElectronConfig(Key) : "";
                    const Shells = Atom.QuantumShells || (Chem && Chem.QuantumShells ? Chem.QuantumShells(Key) : []);
                    const ValenceShell = Shells.length ? Shells[Shells.length - 1] : null;
                    const NVal = ValenceShell ? ValenceShell.n : Math.max(1, Math.ceil(Math.sqrt(Z)));
                    const Zeff = Math.max(0.55, Z - Math.max(0, (NVal - 1) * 2.2) * 0.35);

                    ElementVal.textContent = `${Key} (Z=${Z})`;
                    ConfigVal.textContent = Config || "-";

                    if (State.AutoPick) {
                        const Pick = PickDefaultOrbital(Atom);
                        if (Pick !== State.OrbitalId) {
                            State.OrbitalId = Pick;
                            TypeSel.value = Pick;
                        }
                    }

                    State.Zeff = Zeff;
                    State.AtomKey = Key;

                    const Sig = `${Key}|${State.OrbitalId}|${State.PointCount}|${Zeff.toFixed(2)}`;
                    if (Sig !== State.LastSig) RebuildCloud();
                    Draw();
                }

                TypeSel.addEventListener("change", () => {
                    State.OrbitalId = TypeSel.value;
                    State.AutoPick = false;
                    AutoInput.checked = false;
                    RebuildCloud();
                    Draw();
                });
                DensityInput.addEventListener("input", () => {
                    State.PointCount = Number(DensityInput.value) || 8000;
                    DensityVal.textContent = String(State.PointCount);
                    RebuildCloud();
                    Draw();
                });
                AutoInput.addEventListener("change", () => {
                    State.AutoPick = AutoInput.checked;
                    if (State.AutoPick) SyncFromAtom();
                });

                Canvas.addEventListener("pointerdown", (Event) => {
                    State.Dragging = true;
                    State.LastX = Event.clientX;
                    State.LastY = Event.clientY;
                    Canvas.style.cursor = "grabbing";
                    try { Canvas.setPointerCapture(Event.pointerId); } catch (Err) {}
                    Event.preventDefault();
                });
                Canvas.addEventListener("pointermove", (Event) => {
                    if (!State.Dragging) return;
                    const Dx = Event.clientX - State.LastX;
                    const Dy = Event.clientY - State.LastY;
                    State.LastX = Event.clientX;
                    State.LastY = Event.clientY;
                    State.Yaw -= Dx * 0.01;
                    State.Pitch += Dy * 0.01;
                    State.Pitch = Math.max(-1.45, Math.min(1.45, State.Pitch));
                    Draw();
                });
                const EndDrag = (Event) => {
                    if (!State.Dragging) return;
                    State.Dragging = false;
                    Canvas.style.cursor = "grab";
                    try { Canvas.releasePointerCapture(Event.pointerId); } catch (Err) {}
                };
                Canvas.addEventListener("pointerup", EndDrag);
                Canvas.addEventListener("pointercancel", EndDrag);
                Canvas.addEventListener("lostpointercapture", EndDrag);
                Canvas.addEventListener("wheel", (Event) => {
                    Event.preventDefault();
                    const Delta = Event.deltaY > 0 ? 0.92 : 1.08;
                    State.Zoom = Math.max(0.35, Math.min(3.5, State.Zoom * Delta));
                    Draw();
                }, { passive: false });

                Api.On("Tick", SyncFromAtom);
                SyncFromAtom();
            }
        });
    }

    const Entry = {
        Id: "orbital",
        Name: "Orbital",
        Version: "2.0.0",
        Description: "3D quantum orbital point cloud of the selected atom - drag to rotate",
        Setup(Api) {
            Api.On("OpenPlugin", ({ Id }) => {
                if (Id === "orbital") OpenWidget(Api);
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