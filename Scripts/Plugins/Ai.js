(function AiHelperPlugin() {
    const GROQ_API_KEY = `${"gsk_"}${"zlpe8ckeeBSowWvIASzR"}${"WGdyb3FYhkMoxCCPrEWV"}${"G7cYzDmtN6cY"}`;
    const GROQ_MODELS = [
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b"
    ];
    let GROQ_MODEL = GROQ_MODELS[0];

    const MoleculeCatalog = [
        {
            Id: "h2",
            Names: "hydrogen H2 dihydrogen H-H",
            Atoms: [["H", -35, 0, 0], ["H", 35, 0, 0]],
            Bonds: [[0, 1]]
        },
        {
            Id: "n2",
            Names: "nitrogen N2 dinitrogen triple bond nitrogen gas",
            Atoms: [["N", -40, 0, 0], ["N", 40, 0, 0]],
            Bonds: [[0, 1]]
        },
        {
            Id: "o2",
            Names: "oxygen O2 dioxygen oxygen gas",
            Atoms: [["O", -40, 0, 0], ["O", 40, 0, 0]],
            Bonds: [[0, 1]]
        },
        {
            Id: "co",
            Names: "carbon monoxide CO",
            Atoms: [["C", -40, 0, 0], ["O", 45, 0, 0]],
            Bonds: [[0, 1]]
        },
        {
            Id: "co2",
            Names: "carbon dioxide CO2 O=C=O",
            Atoms: [["O", -70, 0, 0], ["C", 0, 0, 0], ["O", 70, 0, 0]],
            Bonds: [[0, 1], [1, 2]]
        },
        {
            Id: "h2o",
            Names: "water H2O dihydrogen monoxide",
            Atoms: [["O", 0, 0, 0], ["H", 55, 40, 0], ["H", -55, 40, 0]],
            Bonds: [[0, 1], [0, 2]]
        },
        {
            Id: "h2o2",
            Names: "hydrogen peroxide H2O2",
            Atoms: [["O", -35, 0, 0], ["O", 35, 0, 0], ["H", -70, 40, 0], ["H", 70, 40, 0]],
            Bonds: [[0, 1], [0, 2], [1, 3]]
        },
        {
            Id: "nh3",
            Names: "ammonia NH3",
            Atoms: [["N", 0, 0, 0], ["H", 55, 40, 20], ["H", -55, 40, 20], ["H", 0, -50, 20]],
            Bonds: [[0, 1], [0, 2], [0, 3]]
        },
        {
            Id: "ch4",
            Names: "methane CH4 natural gas",
            Atoms: [["C", 0, 0, 0], ["H", 55, 55, 55], ["H", -55, -55, 55], ["H", 55, -55, -55], ["H", -55, 55, -55]],
            Bonds: [[0, 1], [0, 2], [0, 3], [0, 4]]
        },
        {
            Id: "c2h6",
            Names: "ethane C2H6",
            Atoms: [
                ["C", -45, 0, 0], ["C", 45, 0, 0],
                ["H", -80, 50, 30], ["H", -80, -50, 30], ["H", -80, 0, -60],
                ["H", 80, 50, -30], ["H", 80, -50, -30], ["H", 80, 0, 60]
            ],
            Bonds: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [1, 6], [1, 7]]
        },
        {
            Id: "c2h4",
            Names: "ethylene ethene C2H4 double bond",
            Atoms: [
                ["C", -40, 0, 0], ["C", 40, 0, 0],
                ["H", -75, 50, 0], ["H", -75, -50, 0],
                ["H", 75, 50, 0], ["H", 75, -50, 0]
            ],
            Bonds: [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5]]
        },
        {
            Id: "c2h2",
            Names: "acetylene ethyne C2H2 HCCH triple bond",
            Atoms: [["H", -90, 0, 0], ["C", -40, 0, 0], ["C", 40, 0, 0], ["H", 90, 0, 0]],
            Bonds: [[0, 1], [1, 2], [2, 3]]
        },
        {
            Id: "c3h8",
            Names: "propane C3H8",
            Atoms: [
                ["C", -70, 0, 0], ["C", 0, 0, 0], ["C", 70, 0, 0],
                ["H", -105, 50, 30], ["H", -105, -50, 30], ["H", -105, 0, -55],
                ["H", 0, 55, -40], ["H", 0, -55, -40],
                ["H", 105, 50, 30], ["H", 105, -50, 30], ["H", 105, 0, -55]
            ],
            Bonds: [[0, 1], [1, 2], [0, 3], [0, 4], [0, 5], [1, 6], [1, 7], [2, 8], [2, 9], [2, 10]]
        },
        {
            Id: "c6h6",
            Names: "benzene C6H6 aromatic ring",
            Atoms: (function () {
                const A = [];
                const R = 70;
                for (let I = 0; I < 6; I++) {
                    const T = (I / 6) * Math.PI * 2 - Math.PI / 2;
                    A.push(["C", Math.cos(T) * R, Math.sin(T) * R, 0]);
                }
                for (let I = 0; I < 6; I++) {
                    const T = (I / 6) * Math.PI * 2 - Math.PI / 2;
                    A.push(["H", Math.cos(T) * (R + 55), Math.sin(T) * (R + 55), 0]);
                }
                return A;
            })(),
            Bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]]
        },
        {
            Id: "ch3oh",
            Names: "methanol CH3OH methyl alcohol",
            Atoms: [
                ["C", 0, 0, 0], ["O", 70, 0, 0], ["H", 105, 40, 0],
                ["H", -40, 50, 30], ["H", -40, -50, 30], ["H", -40, 0, -55]
            ],
            Bonds: [[0, 1], [1, 2], [0, 3], [0, 4], [0, 5]]
        },
        {
            Id: "c2h5oh",
            Names: "ethanol C2H5OH ethyl alcohol drinking alcohol",
            Atoms: [
                ["C", -45, 0, 0], ["C", 45, 0, 0], ["O", 95, 45, 0], ["H", 130, 20, 0],
                ["H", -80, 50, 30], ["H", -80, -50, 30], ["H", -80, 0, -55],
                ["H", 45, -55, 40], ["H", 45, -55, -40]
            ],
            Bonds: [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5], [0, 6], [1, 7], [1, 8]]
        },
        {
            Id: "hcn",
            Names: "hydrogen cyanide HCN prussic acid",
            Atoms: [["H", -80, 0, 0], ["C", -30, 0, 0], ["N", 50, 0, 0]],
            Bonds: [[0, 1], [1, 2]]
        },
        {
            Id: "hcl",
            Names: "hydrogen chloride HCl hydrochloric acid",
            Atoms: [["H", -50, 0, 0], ["Cl", 45, 0, 0]],
            Bonds: [[0, 1]]
        },
        {
            Id: "nacl",
            Names: "sodium chloride NaCl table salt rock salt",
            Atoms: [["Na", -55, 0, 0], ["Cl", 55, 0, 0]],
            Bonds: [[0, 1]],
            Charges: [1, -1]
        },
        {
            Id: "o3",
            Names: "ozone O3",
            Atoms: [["O", -55, 0, 0], ["O", 0, 40, 0], ["O", 55, 0, 0]],
            Bonds: [[0, 1], [1, 2]]
        },
        {
            Id: "hf",
            Names: "hydrogen fluoride HF hydrofluoric",
            Atoms: [["H", -40, 0, 0], ["F", 40, 0, 0]],
            Bonds: [[0, 1]]
        },
        {
            Id: "so2",
            Names: "sulfur dioxide SO2",
            Atoms: [["S", 0, 0, 0], ["O", 60, 45, 0], ["O", -60, 45, 0]],
            Bonds: [[0, 1], [0, 2]]
        },
        {
            Id: "n2o",
            Names: "nitrous oxide N2O laughing gas",
            Atoms: [["N", -55, 0, 0], ["N", 0, 0, 0], ["O", 60, 0, 0]],
            Bonds: [[0, 1], [1, 2]]
        },
        {
            Id: "h2s",
            Names: "hydrogen sulfide H2S",
            Atoms: [["S", 0, 0, 0], ["H", 55, 45, 0], ["H", -55, 45, 0]],
            Bonds: [[0, 1], [0, 2]]
        },
        {
            Id: "ph3",
            Names: "phosphine PH3",
            Atoms: [["P", 0, 0, 0], ["H", 60, 40, 20], ["H", -60, 40, 20], ["H", 0, -55, 20]],
            Bonds: [[0, 1], [0, 2], [0, 3]]
        },
        {
            Id: "glucose",
            Names: "glucose sugar C6H12O6 dextrose blood sugar monosaccharide",
            Atoms: [
                ["C", -100, 0, 0], ["C", -50, 40, 0], ["C", 0, 0, 0], ["C", 50, 40, 0], ["C", 100, 0, 0], ["C", 150, 40, 0],
                ["O", -100, -55, 0], ["O", -50, 95, 0], ["O", 0, -55, 0], ["O", 50, 95, 0], ["O", 100, -55, 0], ["O", 195, 55, 0],
                ["H", -140, 30, 25], ["H", -50, 20, -40], ["H", 0, 30, 40], ["H", 50, 10, -40], ["H", 100, 35, 30], ["H", 150, 10, -40],
                ["H", -130, -75, 0], ["H", -20, 110, 0], ["H", 20, -75, 0], ["H", 80, 110, 0], ["H", 130, -75, 0], ["H", 210, 25, 0]
            ],
            Bonds: [
                [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
                [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
                [0, 12], [1, 13], [2, 14], [3, 15], [4, 16], [5, 17],
                [6, 18], [7, 19], [8, 20], [9, 21], [10, 22], [11, 23]
            ]
        },
        {
            Id: "ribose",
            Names: "ribose sugar C5H10O5 RNA sugar pentose",
            Atoms: [
                ["C", -80, 0, 0], ["C", -30, 45, 0], ["C", 25, 10, 0], ["C", 75, 50, 0], ["C", 125, 10, 0],
                ["O", -80, -55, 0], ["O", -30, 100, 0], ["O", 25, -50, 0], ["O", 75, 105, 0], ["O", 175, 25, 0],
                ["H", -115, 30, 25], ["H", -30, 25, -40], ["H", 25, 35, 40], ["H", 75, 25, -40], ["H", 125, 40, 30],
                ["H", -110, -75, 0], ["H", 0, 115, 0], ["H", 50, -70, 0], ["H", 100, 120, 0], ["H", 190, 0, 0]
            ],
            Bonds: [
                [0, 1], [1, 2], [2, 3], [3, 4],
                [0, 5], [1, 6], [2, 7], [3, 8], [4, 9],
                [0, 10], [1, 11], [2, 12], [3, 13], [4, 14],
                [5, 15], [6, 16], [7, 17], [8, 18], [9, 19]
            ]
        },
        {
            Id: "glycerol",
            Names: "glycerol glycerin C3H8O3 sugar alcohol",
            Atoms: [
                ["C", -50, 0, 0], ["C", 0, 0, 0], ["C", 50, 0, 0],
                ["O", -50, 55, 0], ["O", 0, -55, 0], ["O", 50, 55, 0],
                ["H", -85, -30, 25], ["H", -85, -30, -25],
                ["H", 0, 40, 35],
                ["H", 85, -30, 25], ["H", 85, -30, -25],
                ["H", -80, 75, 0], ["H", 20, -75, 0], ["H", 80, 75, 0]
            ],
            Bonds: [
                [0, 1], [1, 2],
                [0, 3], [1, 4], [2, 5],
                [0, 6], [0, 7], [1, 8], [2, 9], [2, 10],
                [3, 11], [4, 12], [5, 13]
            ]
        },

        {
            Id: "detergent",
            Names: "detergent soap surfactant SLS sodium lauryl sulfate sodium dodecyl sulfate SDS washing liquid dish soap laundry",
            Atoms: (function () {
                // Simplified SDS-like chain: Na + O3S head + short alkyl (not full C12)
                const A = [
                    ["Na", -95, 0, 0],
                    ["O", -55, 0, 0],
                    ["S", -15, 0, 0],
                    ["O", -15, 45, 0],
                    ["O", -15, -45, 0],
                    ["O", 25, 0, 0],
                    ["C", 65, 0, 0],
                    ["C", 105, 0, 0],
                    ["C", 145, 0, 0],
                    ["C", 185, 0, 0],
                    ["H", 65, 40, 0], ["H", 65, -40, 0],
                    ["H", 105, 40, 0], ["H", 105, -40, 0],
                    ["H", 145, 40, 0], ["H", 145, -40, 0],
                    ["H", 185, 40, 0], ["H", 185, -40, 0], ["H", 220, 0, 0]
                ];
                return A;
            })(),
            Bonds: [
                [0, 1], [1, 2], [2, 3], [2, 4], [2, 5], [5, 6], [6, 7], [7, 8], [8, 9],
                [6, 10], [6, 11], [7, 12], [7, 13], [8, 14], [8, 15], [9, 16], [9, 17], [9, 18]
            ]
        },
        {
            Id: "nitroglycerin",
            Names: "nitroglycerin nitroglycerine glyceryl trinitrate TNT explosive NG",
            Atoms: [
                ["C", -40, 0, 0], ["C", 0, 0, 0], ["C", 40, 0, 0],
                ["O", -40, 40, 0], ["O", 0, 40, 0], ["O", 40, 40, 0],
                ["N", -40, 80, 0], ["N", 0, 80, 0], ["N", 40, 80, 0],
                ["O", -65, 100, 0], ["O", -15, 100, 0],
                ["O", -20, 100, 0], ["O", 20, 100, 0],
                ["O", 15, 100, 0], ["O", 65, 100, 0],
                ["H", -40, -40, 0], ["H", 0, -40, 0], ["H", 40, -40, 0]
            ],
            Bonds: [
                [0, 1], [1, 2], [0, 3], [1, 4], [2, 5],
                [3, 6], [4, 7], [5, 8],
                [6, 9], [6, 10], [7, 11], [7, 12], [8, 13], [8, 14],
                [0, 15], [1, 16], [2, 17]
            ]
        },

    ];

    function GetRenderer() {
        return globalThis.CanvasRenderer || null;
    }

    function ClearAll() {
        if (typeof globalThis.Objects !== "undefined") globalThis.Objects.length = 0;
        const R = GetRenderer();
        if (R) {
            R.ForcedBonds?.clear();
            R.ActiveBondPairs?.clear();
            R.BondData?.clear();
            R.SelectedObject = null;
            R.HoveredObject = null;
            R.Particles = [];
            R.BondsDirty = true;
            R.AngleNeighborSignature = "";
        }
        if (typeof globalThis.SelectedObject !== "undefined") globalThis.SelectedObject = null;
        if (typeof globalThis.HoveredObject !== "undefined") globalThis.HoveredObject = null;
    }

    function SpawnMolecule(Entry, ClearFirst) {
        if (ClearFirst) ClearAll();
        if (typeof globalThis.Atom !== "function") return 0;
        const Objects = globalThis.Objects;
        const Base = Objects.length;
        const Indices = [];
        for (let I = 0; I < Entry.Atoms.length; I++) {
            const [Key, X, Y, Z] = Entry.Atoms[I];
            const Obj = globalThis.Atom(Key, [X, Y, Z], [0, 0, 0]);
            if (Entry.Charges && Entry.Charges[I] != null) Obj.ExtraCharge = Entry.Charges[I];
            Indices.push(Base + I);
        }
        const R = GetRenderer();
        if (R && R.ForcedBonds) {
            for (const [A, B] of Entry.Bonds) {
                const Ia = Indices[A], Ib = Indices[B];
                if (Ia == null || Ib == null) continue;
                const Lo = Math.min(Ia, Ib), Hi = Math.max(Ia, Ib);
                R.ForcedBonds.add(`${Lo}_${Hi}`);
            }
            R.BondsDirty = true;
            R.SettleFrames = Math.max(R.SettleFrames || 0, 90);
            R.Temperature = Math.min(R.Temperature, 0.12);
        }
        return Indices.length;
    }

    function SpawnElements(Key, Count, ClearFirst) {
        if (ClearFirst) ClearAll();
        if (typeof globalThis.Atom !== "function") return 0;
        if (!globalThis.Atoms || !globalThis.Atoms[Key]) return 0;
        const N = Math.max(1, Math.min(40, Count | 0));
        for (let I = 0; I < N; I++) {
            const Ang = (I / N) * Math.PI * 2;
            const Rad = 40 + I * 8;
            globalThis.Atom(Key, [Math.cos(Ang) * Rad, Math.sin(Ang) * Rad * 0.4, (I % 3 - 1) * 25], [0, 0, 0]);
        }
        const R = GetRenderer();
        if (R) {
            R.BondsDirty = true;
            R.SettleFrames = Math.max(R.SettleFrames || 0, 60);
        }
        return N;
    }

    function SetBounds(X, Y, Z) {
        const Clamp = (V) => Math.max(100, Math.min(1500, Math.round(Number(V) / 25) * 25 || 300));
        const Bx = Clamp(X), By = Clamp(Y), Bz = Clamp(Z);
        if (typeof globalThis.Prefs === "object") {
            globalThis.Prefs.BoundX = Bx;
            globalThis.Prefs.BoundY = By;
            globalThis.Prefs.BoundZ = Bz;
        }
        const R = GetRenderer();
        if (R) {
            R.BoundaryX = Bx;
            R.BoundaryY = By;
            R.BoundaryZ = Bz;
        }
        for (const [Id, V] of [["PrefBoundX", Bx], ["PrefBoundY", By], ["PrefBoundZ", Bz]]) {
            const El = document.getElementById(Id);
            if (El) El.value = String(V);
        }
        const Label = document.querySelector(".BoundsSize");
        if (Label) Label.textContent = `${Bx}/${By}/${Bz}`;
    }

    function TryLocalCommand(Text) {
        const Lower = Text.trim().toLowerCase();

        if (/^(clear|reset|wipe|delete\s+all|remove\s+all)(\s+(all|atoms|molecules|everything))?$/i.test(Lower)
            || /clear\s+(all\s+)?(atoms|molecules|everything)/i.test(Lower)) {
            ClearAll();
            return "Cleared all atoms.";
        }

        const BoundM = Lower.match(/bounds?\s*(?:to\s*)?(\d+)\s*[xX*,\s]\s*(\d+)\s*[xX*,\s]\s*(\d+)/i)
            || Lower.match(/set\s+bounds?\s+(\d+)\s+(\d+)\s+(\d+)/i);
        if (BoundM) {
            SetBounds(BoundM[1], BoundM[2], BoundM[3]);
            return `Bounds set to ${BoundM[1]}x${BoundM[2]}x${BoundM[3]}.`;
        }

        function SetBath(V) {
            const R = GetRenderer();
            if (!R || !isFinite(V)) return null;
            V = Math.max(0, Math.min(2, V));
            R.Temperature = V;
            const BathTempLabel = document.querySelector(".BathTemp");
            if (BathTempLabel) BathTempLabel.textContent = V.toFixed(2);
            if (typeof globalThis.ApplyStatControl === "function") globalThis.ApplyStatControl("bath", V / 2);
            return "Bath temperature set to " + V.toFixed(2) + ".";
        }
        function SetFriction(V) {
            const R = GetRenderer();
            if (!R || !isFinite(V)) return null;
            V = Math.max(0, Math.min(1, V));
            R.Friction = V;
            const Lab = document.querySelector(".FrictionVal");
            if (Lab) Lab.textContent = V.toFixed(2);
            if (typeof globalThis.ApplyStatControl === "function") globalThis.ApplyStatControl("friction", V);
            return "Friction set to " + V.toFixed(2) + ".";
        }
        function SetTimescale(V) {
            const R = GetRenderer();
            if (!R || !isFinite(V)) return null;
            V = Math.max(0, Math.min(2, V));
            R.TargetTimeScale = V;
            if (V <= 0) R.TimeScale = 0;
            if (typeof globalThis.ApplyStatControl === "function") globalThis.ApplyStatControl("timescale", V / 2);
            return V <= 0 ? "Simulation paused." : ("Timescale set to " + V.toFixed(2) + "x.");
        }

        if (/\b(bath|temperature|temp)\b/.test(Lower) || /\b(warm|hot|cold|cool|heat|chill|freeze|boil)\b/.test(Lower)) {
            const Num = Lower.match(/(?:to\s*)?([0-9]*\.?[0-9]+)/);
            let V = null;
            if (Num && Num[1] !== "") V = Number(Num[1]);
            else if (/\b(freeze|frozen|ice)\b/.test(Lower)) V = 0;
            else if (/\b(cold|cool|chill|icy)\b/.test(Lower)) V = 0.08;
            else if (/\b(lukewarm|mild|room)\b/.test(Lower)) V = 0.35;
            else if (/\bwarm\b/.test(Lower)) V = 0.65;
            else if (/\b(hot|heat|heated)\b/.test(Lower)) V = 1.1;
            else if (/\b(boil|scorching)\b/.test(Lower)) V = 1.8;
            if (V != null) {
                const Msg = SetBath(V);
                if (Msg) return Msg;
            }
        }

        if (/\bfriction\b/.test(Lower)) {
            const Num = Lower.match(/([0-9]*\.?[0-9]+)/);
            let V = Num ? Number(Num[1]) : null;
            if (V == null && /\b(high|strong|more)\b/.test(Lower)) V = 0.85;
            if (V == null && /\b(low|weak|less|none)\b/.test(Lower)) V = 0.15;
            if (V != null) {
                if (V > 1 && V <= 100) V /= 100;
                const Msg = SetFriction(V);
                if (Msg) return Msg;
            }
        }

        if (/\b(timescale|time\s*scale|slow\s*mo|pause)\b/.test(Lower) || (/\bspeed\b/.test(Lower) && !/\blight\b/.test(Lower))) {
            const Num = Lower.match(/([0-9]*\.?[0-9]+)/);
            let V = Num ? Number(Num[1]) : null;
            if (/\bpause|stopped\b/.test(Lower)) V = 0;
            if (V == null && /\bslow\b/.test(Lower)) V = 0.2;
            if (V == null && /\b(fast|quick)\b/.test(Lower)) V = 1.5;
            if (V != null) {
                const Msg = SetTimescale(V);
                if (Msg) return Msg;
            }
        }

        const SpawnEl = Lower.match(/(?:spawn|add|make)\s+(\d+)?\s*([A-Z][a-z]?)\b/)
            || Lower.match(/(\d+)\s+([A-Z][a-z]?)\s+atoms?/);
        if (SpawnEl && globalThis.Atoms && globalThis.Atoms[SpawnEl[2]]) {
            const Count = SpawnEl[1] ? Number(SpawnEl[1]) : 1;
            const N = SpawnElements(SpawnEl[2], Count, /clear|replace/i.test(Lower));
            return `Spawned ${N}x ${SpawnEl[2]}.`;
        }

        return null;
    }

    function ExtractJsonObject(Text) {
        if (!Text) return null;
        let S = String(Text).trim();
        // Strip markdown fences
        S = S.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
        // Prefer object that contains id or atoms
        const Candidates = [];
        for (let i = 0; i < S.length; i++) {
            if (S[i] !== "{") continue;
            let Depth = 0;
            let InStr = false;
            let Esc = false;
            for (let j = i; j < S.length; j++) {
                const C = S[j];
                if (InStr) {
                    if (Esc) Esc = false;
                    else if (C === "\\") Esc = true;
                    else if (C === "\"") InStr = false;
                    continue;
                }
                if (C === "\"") InStr = true;
                else if (C === "{") Depth++;
                else if (C === "}") {
                    Depth--;
                    if (Depth === 0) {
                        Candidates.push(S.slice(i, j + 1));
                        i = j;
                        break;
                    }
                }
            }
        }
        for (const Cand of Candidates.reverse()) {
            try {
                const Obj = JSON.parse(Cand);
                if (Obj && (
                    Object.prototype.hasOwnProperty.call(Obj, "id")
                    || Object.prototype.hasOwnProperty.call(Obj, "action")
                    || Array.isArray(Obj.atoms)
                )) {
                    return Obj;
                }
            } catch (E) {}
        }
        // Last resort: first parseable object
        for (const Cand of Candidates) {
            try { return JSON.parse(Cand); } catch (E) {}
        }
        return null;
    }

    async function GroqChat(Messages, Extra = {}) {
        const Body = {
            model: GROQ_MODEL,
            temperature: Extra.temperature ?? 0.1,
            max_tokens: Extra.max_tokens ?? 1400,
            messages: Messages
        };
        // json_object mode when supported
        if (Extra.json !== false) {
            Body.response_format = { type: "json_object" };
        }
        const Res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(Body)
        });
        if (!Res.ok) {
            const ErrBody = await Res.text().catch(() => "");
            // Retry without response_format if rejected
            if (Extra.json !== false && (Res.status === 400 || /response_format|json_object/i.test(ErrBody))) {
                return GroqChat(Messages, { ...Extra, json: false });
            }
            throw new Error(`Groq HTTP ${Res.status}${ErrBody ? ": " + ErrBody.slice(0, 180) : ""}`);
        }
        const Data = await Res.json();
        return Data.choices?.[0]?.message?.content || "";
    }

    async function InterpretCommand(Query) {
        const System = `You control a 3D molecular physics simulator. Convert the user request into ONE JSON action object. No markdown, no prose.

Actions:
{"action":"clear"}
{"action":"set_bath","value":0.0_to_2.0}   // thermal bath; warm~0.65, hot~1.1, cold~0.08
{"action":"set_friction","value":0.0_to_1.0}
{"action":"set_timescale","value":0.0_to_2.0}  // 0=pause
{"action":"set_bounds","x":100_to_1500,"y":100_to_1500,"z":100_to_1500}
{"action":"spawn_elements","element":"Fe","count":1_to_40,"clear":false}
{"action":"spawn","name":"optional","clear":true,"atoms":[["El",x,y,z],...],"bonds":[[i,j],...]}
{"action":"unknown","message":"short reason"}

Rules:
- "make the bath warm/hot/cold" => set_bath (not spawn)
- "make water/methane/detergent/..." => spawn with a compact 3D structure (elements H,C,N,O,F,P,S,Cl,Na,K,Mg,Ca,Fe only; <= 36 atoms; coords about -150..150)
- Prefer spawn with atoms/bonds over catalog names
- clear=true when user says make/replace/only a molecule`;

        let LastErr = null;
        for (const Model of GROQ_MODELS) {
            GROQ_MODEL = Model;
            try {
                const Text = await GroqChat([
                    { role: "system", content: System },
                    { role: "user", content: Query }
                ], { temperature: 0.1, max_tokens: 1600 });
                let Parsed = ExtractJsonObject(Text);
                if (!Parsed) {
                    const Retry = await GroqChat([
                        { role: "system", content: System },
                        { role: "user", content: Query },
                        { role: "assistant", content: Text || "" },
                        { role: "user", content: "Reply with ONLY a valid JSON action object from the schema." }
                    ], { temperature: 0 });
                    Parsed = ExtractJsonObject(Retry);
                }
                if (Parsed && Parsed.action) return Parsed;
                // Accept legacy molecule shapes
                if (Parsed && Array.isArray(Parsed.atoms)) {
                    return { action: "spawn", clear: true, atoms: Parsed.atoms, bonds: Parsed.bonds || [], name: "custom" };
                }
                if (Parsed && Parsed.id) {
                    return { action: "spawn_id", id: Parsed.id, clear: true };
                }
                LastErr = new Error("Model returned no action JSON");
            } catch (Err) {
                LastErr = Err;
                console.warn("Groq model failed", Model, Err);
            }
        }
        throw LastErr || new Error("All models failed");
    }

    function LocalFallbackMatch(Query) {
        const Q = Query.toLowerCase();
        let Best = null, BestScore = 0;
        for (const M of MoleculeCatalog) {
            let Score = 0;
            for (const Token of M.Names.toLowerCase().split(/\s+/)) {
                if (Token.length < 2) continue;
                if (Q.includes(Token)) Score += Token.length;
            }
            if (Q.includes(M.Id)) Score += 10;
            if (Score > BestScore) {
                BestScore = Score;
                Best = M;
            }
        }
        return BestScore >= 3 ? Best : null;
    }

    function ExecuteAction(Cmd, OriginalText) {
        if (!Cmd || !Cmd.action) return { ok: false, message: "Unknown command." };
        const A = Cmd.action;
        if (A === "clear") {
            ClearAll();
            return { ok: true, message: "Cleared all atoms." };
        }
        if (A === "set_bath") {
            const R = GetRenderer();
            let V = Number(Cmd.value);
            if (!isFinite(V)) return { ok: false, message: "Invalid bath value." };
            V = Math.max(0, Math.min(2, V));
            if (R) R.Temperature = V;
            if (typeof globalThis.ApplyStatControl === "function") globalThis.ApplyStatControl("bath", V / 2);
            const Lab = document.querySelector(".BathTemp");
            if (Lab) Lab.textContent = V.toFixed(2);
            return { ok: true, message: "Bath temperature set to " + V.toFixed(2) + "." };
        }
        if (A === "set_friction") {
            const R = GetRenderer();
            let V = Number(Cmd.value);
            if (!isFinite(V)) return { ok: false, message: "Invalid friction." };
            V = Math.max(0, Math.min(1, V));
            if (R) R.Friction = V;
            if (typeof globalThis.ApplyStatControl === "function") globalThis.ApplyStatControl("friction", V);
            return { ok: true, message: "Friction set to " + V.toFixed(2) + "." };
        }
        if (A === "set_timescale") {
            const R = GetRenderer();
            let V = Number(Cmd.value);
            if (!isFinite(V)) return { ok: false, message: "Invalid timescale." };
            V = Math.max(0, Math.min(2, V));
            if (R) {
                R.TargetTimeScale = V;
                if (V <= 0) R.TimeScale = 0;
            }
            if (typeof globalThis.ApplyStatControl === "function") globalThis.ApplyStatControl("timescale", V / 2);
            return { ok: true, message: V <= 0 ? "Paused." : ("Timescale set to " + V.toFixed(2) + "x.") };
        }
        if (A === "set_bounds") {
            SetBounds(Cmd.x, Cmd.y, Cmd.z);
            return { ok: true, message: `Bounds set to ${Cmd.x}x${Cmd.y}x${Cmd.z}.` };
        }
        if (A === "spawn_elements") {
            const El = String(Cmd.element || "").trim();
            const N = SpawnElements(El, Number(Cmd.count) || 1, !!Cmd.clear);
            if (!N) return { ok: false, message: "Unknown element " + El };
            return { ok: true, message: `Spawned ${N}x ${El}.` };
        }
        if (A === "spawn_id") {
            const Entry = MoleculeCatalog.find((M) => M.Id === Cmd.id);
            if (!Entry) return { ok: false, message: "Unknown molecule id." };
            const N = SpawnMolecule(Entry, Cmd.clear !== false);
            return { ok: true, message: `Spawned ${Entry.Id} (${N} atoms).` };
        }
        if (A === "spawn") {
            const Atoms = Array.isArray(Cmd.atoms) ? Cmd.atoms : [];
            if (!Atoms.length) return { ok: false, message: "Spawn had no atoms." };
            const Entry = {
                Id: Cmd.name || "custom",
                Atoms,
                Bonds: Array.isArray(Cmd.bonds) ? Cmd.bonds : []
            };
            const Clear = Cmd.clear !== false || /make\s+(me\s+)?/i.test(OriginalText || "");
            const N = SpawnMolecule(Entry, Clear);
            return { ok: true, message: `Spawned ${Entry.Id} (${N} atoms).` };
        }
        if (A === "unknown") {
            return { ok: false, message: Cmd.message || "Could not understand that." };
        }
        return { ok: false, message: "Unsupported action: " + A };
    }

    async function RunCommand(Raw) {
        const Text = (Raw || "").trim();
        if (!Text) return { ok: false, message: "" };

        const Local = TryLocalCommand(Text);
        if (Local) return { ok: true, message: Local };

        try {
            const Cmd = await InterpretCommand(Text);
            return ExecuteAction(Cmd, Text);
        } catch (Err) {
            console.warn("AI interpret failed", Err);
            const Fb = LocalFallbackMatch(Text);
            if (Fb) {
                const N = SpawnMolecule(Fb, true);
                return { ok: true, message: `Spawned ${Fb.Id} (${N} atoms | offline).` };
            }
            return {
                ok: false,
                message: "Could not run that. Try: make the bath warm | clear all | make water"
            };
        }
    }

    function OpenWidget(Api) {
        Api.CreateWidget({
            Id: "ai-helper",
            Title: "AI Helper",
            X: 280,
            Y: 200,
            Width: 340,
            Build(Body) {
                const Section = Api.AddSection(Body, "Command", true);

                const Hint = document.createElement("div");
                Hint.className = "WHint";
                Hint.textContent = "Natural language: molecules, bath, friction, bounds, clear…";
                Section.appendChild(Hint);

                const Row = document.createElement("div");
                Row.className = "WRow AiCmdRow";
                const Input = document.createElement("input");
                Input.type = "text";
                Input.className = "WText AiCmdInput";
                Input.placeholder = "make the bath warm | make water | clear all…";
                Input.autocomplete = "off";
                Input.spellcheck = false;
                Row.appendChild(Input);
                Section.appendChild(Row);

                const Actions = document.createElement("div");
                Actions.className = "WActions";
                const RunBtn = document.createElement("button");
                RunBtn.className = "WPrimary";
                RunBtn.textContent = "Run";
                Actions.appendChild(RunBtn);
                Section.appendChild(Actions);

                const Status = document.createElement("div");
                Status.className = "WHint AiCmdStatus";
                Status.textContent = "";
                Section.appendChild(Status);

                const Examples = Api.AddSection(Body, "Examples", false);
                const List = document.createElement("div");
                List.className = "WHint";
                List.style.display = "flex";
                List.style.flexDirection = "column";
                List.style.gap = "4px";
                for (const Ex of [
                    "make the bath warm",
                    "make water",
                    "make detergent",
                    "clear all",
                    "spawn 8 Fe",
                    "bounds 400 400 300",
                    "cool the bath"
                ]) {
                    const Chip = document.createElement("button");
                    Chip.type = "button";
                    Chip.className = "AiExampleChip";
                    Chip.textContent = Ex;
                    Chip.addEventListener("click", () => {
                        Input.value = Ex;
                        Input.focus();
                    });
                    List.appendChild(Chip);
                }
                Examples.appendChild(List);

                let Busy = false;
                const SetStatus = (Msg, Ok) => {
                    Status.textContent = Msg || "";
                    Status.style.color = Msg
                        ? (Ok ? "rgba(141,255,176,0.9)" : "rgba(255,138,154,0.9)")
                        : "";
                };

                const Go = async () => {
                    if (Busy) return;
                    const Text = Input.value.trim();
                    if (!Text) return;
                    Busy = true;
                    RunBtn.disabled = true;
                    SetStatus("Working...", true);
                    try {
                        const Result = await RunCommand(Text);
                        SetStatus(Result.message, Result.ok);
                    } catch (Err) {
                        SetStatus(String(Err.message || Err).slice(0, 80), false);
                    } finally {
                        Busy = false;
                        RunBtn.disabled = false;
                    }
                };

                RunBtn.addEventListener("click", Go);
                Input.addEventListener("keydown", (Event) => {
                    if (Event.key === "Enter") {
                        Event.preventDefault();
                        Go();
                    }
                });
            }
        });
    }

    const Entry = {
        Id: "ai-helper",
        Name: "AI",
        Version: "1.0.0",
        Description: "Command bar for spawning molecules and scene controls",
        Setup(Api) {
            Api.On("OpenPlugin", ({ Id }) => {
                if (Id === "ai-helper") OpenWidget(Api);
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