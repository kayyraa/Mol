(function AiHelperPlugin() {
    const GROQ_API_KEY = `${"gsk_"}${"zlpe8ckeeBSowWvIASzR"}${"WGdyb3FYhkMoxCCPrEWV"}${"G7cYzDmtN6cY"}`;
    const GROQ_MODEL = "llama-3.3-70b-versatile";

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
        }
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

        const TempM = Lower.match(/(?:bath|temp(?:erature)?)\s*(?:to\s*)?([0-9]*\.?[0-9]+)/i)
            || Lower.match(/(?:cool|heat)\s+(?:the\s+)?(?:bath|system)?/i);
        if (TempM) {
            let V;
            if (TempM[1] != null) V = Number(TempM[1]);
            else if (/cool/i.test(Lower)) V = 0.08;
            else if (/heat/i.test(Lower)) V = 0.8;
            const R = GetRenderer();
            if (isFinite(V) && R) {
                V = Math.max(0, Math.min(2, V));
                R.Temperature = V;
                const BathEl = document.getElementById("PrefBath");
                const BathVal = document.getElementById("PrefBathVal");
                if (BathEl) BathEl.value = String(V);
                if (BathVal) BathVal.textContent = V.toFixed(2);
                const BathTempLabel = document.querySelector(".BathTemp");
                if (BathTempLabel) BathTempLabel.textContent = V.toFixed(2);
                return `Bath temperature set to ${V.toFixed(2)}.`;
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

    async function MatchMoleculeWithGroq(Query) {
        const CatalogLines = MoleculeCatalog.map((M) => `- ${M.Id}: ${M.Names}`).join("\n");
        const System = `You map user requests to a molecule id from a fixed catalog for a chemistry simulator.
Reply with ONLY a JSON object: {"id":"<catalog_id>"} or {"id":null} if nothing fits.
Valid ids:\n${CatalogLines}`;
        const Res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                temperature: 0,
                max_tokens: 40,
                messages: [
                    { role: "system", content: System },
                    { role: "user", content: Query }
                ]
            })
        });
        if (!Res.ok) {
            const Body = await Res.text().catch(() => "");
            throw new Error(`Groq HTTP ${Res.status}${Body ? ": " + Body.slice(0, 140) : ""}`);
        }
        const Data = await Res.json();
        const Text = Data.choices?.[0]?.message?.content || "";
        const JsonMatch = Text.match(/\{[\s\S]*\}/);
        if (!JsonMatch) throw new Error("No JSON in model reply");
        let Parsed;
        try { Parsed = JSON.parse(JsonMatch[0]); } catch (E) { throw new Error("Bad JSON from model"); }
        const Id = Parsed && Parsed.id;
        if (!Id) return { Entry: null, Score: 0 };
        const Entry = MoleculeCatalog.find((M) => M.Id === Id) || null;
        return { Entry, Score: Entry ? 1 : 0, Index: Entry ? MoleculeCatalog.indexOf(Entry) : -1 };
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

    async function RunCommand(Raw) {
        const Text = (Raw || "").trim();
        if (!Text) return { ok: false, message: "" };

        const Local = TryLocalCommand(Text);
        if (Local) return { ok: true, message: Local };

        let Entry = null;
        let Via = "local";
        try {
            const Ranked = await MatchMoleculeWithGroq(Text);
            Entry = Ranked.Entry;
            Via = Ranked.Score ? 'groq' : 'none';
            if ((Ranked.Score || 0) < 0.05) {
                const Fb = LocalFallbackMatch(Text);
                if (Fb) { Entry = Fb; Via = "fallback"; }
            }
        } catch (Err) {
            console.warn("AI groq failed", Err);
            Entry = LocalFallbackMatch(Text);
            Via = "offline";
            if (!Entry) {
                return { ok: false, message: String(Err.message || Err).slice(0, 80) };
            }
        }

        if (!Entry) {
            return { ok: false, message: "No matching molecule in catalog." };
        }

        const ClearFirst = /clear|replace|only|fresh/i.test(Text) || /make\s+(me\s+)?/i.test(Text);
        const N = SpawnMolecule(Entry, ClearFirst);
        return { ok: true, message: `Spawned ${Entry.Id.toUpperCase()} (${N} atoms | ${Via})` };
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
                Hint.textContent = "Spawn molecules, clear the scene, set bounds or bath temp.";
                Section.appendChild(Hint);

                const Row = document.createElement("div");
                Row.className = "WRow AiCmdRow";
                const Input = document.createElement("input");
                Input.type = "text";
                Input.className = "WText AiCmdInput";
                Input.placeholder = "Make acetylene | clear all | cool bath...";
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
                    "make acetylene",
                    "glucose",
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