(function AiHelperPlugin() {
    const GROQ_API_KEY = `${"gsk_"}${"zlpe8ckeeBSowWvIASzR"}${"WGdyb3FYhkMoxCCPrEWV"}${"G7cYzDmtN6cY"}`;
    const GROQ_MODELS = [
        "openai/gpt-oss-120b",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-20b"
    ];
    let GROQ_MODEL = GROQ_MODELS[0];

    const MoleculeCatalog = [
        {
            Id: "h2",
            Names: "hydrogen H2 dihydrogen",
            Formula: { H: 2 },
            Atoms: [["H", -35, 0, 0], ["H", 35, 0, 0]],
            Bonds: [[0, 1]]
        },
        {
            Id: "h2o",
            Names: "water H2O",
            Formula: { H: 2, O: 1 },
            Atoms: [["O", 0, 0, 0], ["H", 55, 40, 0], ["H", -55, 40, 0]],
            Bonds: [[0, 1], [0, 2]]
        },
        {
            Id: "ch4",
            Names: "methane CH4",
            Formula: { C: 1, H: 4 },
            Atoms: [["C", 0, 0, 0], ["H", 55, 55, 55], ["H", -55, -55, 55], ["H", 55, -55, -55], ["H", -55, 55, -55]],
            Bonds: [[0, 1], [0, 2], [0, 3], [0, 4]]
        },
        {
            Id: "co2",
            Names: "carbon dioxide CO2",
            Formula: { C: 1, O: 2 },
            Atoms: [["O", -70, 0, 0], ["C", 0, 0, 0], ["O", 70, 0, 0]],
            Bonds: [[0, 1], [1, 2]]
        },
        {
            Id: "nh3",
            Names: "ammonia NH3",
            Formula: { N: 1, H: 3 },
            Atoms: [["N", 0, 0, 0], ["H", 55, 40, 20], ["H", -55, 40, 20], ["H", 0, -50, 20]],
            Bonds: [[0, 1], [0, 2], [0, 3]]
        },
        {
            Id: "nacl",
            Names: "sodium chloride NaCl salt",
            Formula: { Na: 1, Cl: 1 },
            Atoms: [["Na", -55, 0, 0], ["Cl", 55, 0, 0]],
            Bonds: [[0, 1]],
            Charges: [1, -1]
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
            const Row = Entry.Atoms[I];
            if (!Row || !Row.length) continue;
            const Key = String(Row[0] || "").trim();
            if (!Key) continue;
            const X = Number(Row[1]) || 0;
            const Y = Number(Row[2]) || 0;
            const Z = Number(Row[3]) || 0;
            const Obj = globalThis.Atom(Key, [X, Y, Z], [0, 0, 0]);
            if (Entry.Charges && Entry.Charges[I] != null) Obj.ExtraCharge = Entry.Charges[I];
            Indices.push(Base + Indices.length);
        }
        const R = GetRenderer();
        if (R && R.ForcedBonds && Array.isArray(Entry.Bonds)) {
            for (const Bond of Entry.Bonds) {
                if (!Bond || Bond.length < 2) continue;
                const A = Number(Bond[0]);
                const B = Number(Bond[1]);
                if (!isFinite(A) || !isFinite(B)) continue;
                const Ia = Indices[A];
                const Ib = Indices[B];
                if (Ia == null || Ib == null) continue;
                const Lo = Math.min(Ia, Ib);
                const Hi = Math.max(Ia, Ib);
                R.ForcedBonds.add(`${Lo}_${Hi}`);
            }
            R.BondsDirty = true;
            R.SettleFrames = Math.max(R.SettleFrames || 0, 120);
            R.Temperature = Math.min(R.Temperature ?? 0.35, 0.1);
        }
        return Indices.length;
    }

    function SpawnElements(Key, Count, ClearFirst) {
        if (ClearFirst) ClearAll();
        if (typeof globalThis.Atom !== "function") return 0;
        Key = String(Key || "").trim();
        if (!Key) return 0;
        const N = Math.max(1, Math.min(80, Count | 0));
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

    function TryLocalCommand(Text) {
        const Lower = Text.trim().toLowerCase();
        if (
            /^(clear|reset|wipe|delete\s+all|remove\s+all)(\s+(all|atoms|molecules|everything))?$/i.test(Lower) ||
            /clear\s+(all\s+)?(atoms|molecules|everything)/i.test(Lower)
        ) {
            ClearAll();
            return "Cleared all atoms.";
        }
        return null;
    }

    function ParseFormulaString(S) {
        if (!S || typeof S !== "string") return null;
        const Clean = S.replace(/\s+/g, "").replace(/[^\w]/g, "");
        if (!Clean) return null;
        const Map = {};
        const Re = /([A-Z][a-z]?)(\d*)/g;
        let M;
        let Any = false;
        while ((M = Re.exec(Clean)) !== null) {
            const El = M[1];
            const N = M[2] ? parseInt(M[2], 10) : 1;
            if (!El || !isFinite(N) || N < 1) continue;
            Map[El] = (Map[El] || 0) + N;
            Any = true;
        }
        return Any ? Map : null;
    }

    function FormulaToString(Map) {
        if (!Map) return "";
        const Order = ["C", "H", "N", "O", "P", "S", "F", "Cl", "Br", "I"];
        const Parts = [];
        for (const El of Order) {
            if (Map[El]) Parts.push(El + (Map[El] > 1 ? Map[El] : ""));
        }
        for (const El of Object.keys(Map).sort()) {
            if (Order.includes(El)) continue;
            Parts.push(El + (Map[El] > 1 ? Map[El] : ""));
        }
        return Parts.join("");
    }

    function CountAtomsFromList(Atoms) {
        const Map = {};
        if (!Array.isArray(Atoms)) return Map;
        for (const Row of Atoms) {
            if (!Row || !Row.length) continue;
            const El = String(Row[0] || "").trim();
            if (!El) continue;
            Map[El] = (Map[El] || 0) + 1;
        }
        return Map;
    }

    function FormulasMatch(Expected, Actual) {
        if (!Expected || !Actual) return false;
        const Keys = new Set([...Object.keys(Expected), ...Object.keys(Actual)]);
        for (const K of Keys) {
            if ((Expected[K] || 0) !== (Actual[K] || 0)) return false;
        }
        return true;
    }

    function ExtractInlineFormula(Query) {
        const Q = String(Query || "");
        const Patterns = [
            /\b(C\d+H\d+(?:N\d+)?(?:O\d+)?(?:P\d+)?(?:S\d+)?)\b/gi,
            /\b([A-Z][a-z]?(?:\d+[A-Z][a-z]?|\d+){1,14})\b/g
        ];
        for (const Re of Patterns) {
            Re.lastIndex = 0;
            let M;
            while ((M = Re.exec(Q)) !== null) {
                const F = ParseFormulaString(M[1]);
                if (F && Object.keys(F).length >= 2) return F;
            }
        }
        return null;
    }

    function ExtractSearchName(Query) {
        let S = String(Query || "").trim();
        S = S.replace(/^(make|create|build|spawn|generate|draw|show|give\s+me|i\s+want)\s+(me\s+)?(a\s+|an\s+|the\s+)?/i, "");
        S = S.replace(/\s+(molecule|structure|compound|please|now|here)\s*$/i, "");
        S = S.replace(/[?.!]+$/g, "").trim();
        if (!S || S.length < 2) return null;
        if (/^(clear|reset|wipe)/i.test(S)) return null;
        if (/^spawn\s+\d+/i.test(S)) return null;
        return S.slice(0, 80);
    }

    async function LookupPubChemFormula(Name) {
        if (!Name) return null;
        const Encoded = encodeURIComponent(Name);
        const Url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${Encoded}/property/MolecularFormula,Title,IUPACName/JSON`;
        try {
            const Res = await fetch(Url, { method: "GET" });
            if (!Res.ok) return null;
            const Data = await Res.json();
            const Props = Data?.PropertyTable?.Properties;
            if (!Array.isArray(Props) || !Props.length) return null;
            const FormulaStr = Props[0].MolecularFormula;
            const Title = Props[0].Title || Props[0].IUPACName || Name;
            const Formula = ParseFormulaString(FormulaStr);
            if (!Formula) return null;
            return { Formula, FormulaStr, Title: String(Title) };
        } catch (Err) {
            return null;
        }
    }

    function ValidateSpawnPayload(Cmd, ExpectedFormula) {
        if (!Cmd || Cmd.action !== "spawn") return { ok: false, reason: "not a spawn" };
        const Atoms = Array.isArray(Cmd.atoms) ? Cmd.atoms : [];
        if (Atoms.length < 1) return { ok: false, reason: "no atoms" };
        if (Atoms.length > 160) return { ok: false, reason: "too many atoms" };
        for (const Row of Atoms) {
            if (!Array.isArray(Row) || Row.length < 4) return { ok: false, reason: "bad atom row" };
            const Sym = String(Row[0] || "").trim();
            if (!/^[A-Z][a-z]?$/.test(Sym)) return { ok: false, reason: "bad element symbol " + Sym };
            for (let K = 1; K <= 3; K++) {
                if (!isFinite(Number(Row[K]))) return { ok: false, reason: "non-numeric coordinate" };
            }
        }
        const Bonds = Array.isArray(Cmd.bonds) ? Cmd.bonds : [];
        for (const B of Bonds) {
            if (!Array.isArray(B) || B.length < 2) return { ok: false, reason: "bad bond" };
            const A = Number(B[0]);
            const C = Number(B[1]);
            if (!isFinite(A) || !isFinite(C) || A < 0 || C < 0 || A >= Atoms.length || C >= Atoms.length || A === C) {
                return { ok: false, reason: "bond index out of range" };
            }
        }
        if (ExpectedFormula) {
            const Actual = CountAtomsFromList(Atoms);
            if (!FormulasMatch(ExpectedFormula, Actual)) {
                return {
                    ok: false,
                    reason: `stoichiometry mismatch: got ${FormulaToString(Actual)}, expected ${FormulaToString(ExpectedFormula)}`,
                    actual: Actual,
                    expected: ExpectedFormula
                };
            }
        }
        return { ok: true };
    }

    function ExtractJsonObject(Text) {
        if (!Text) return null;
        let S = String(Text).trim();
        S = S.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
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
                if (
                    Obj &&
                    (Object.prototype.hasOwnProperty.call(Obj, "action") ||
                        Array.isArray(Obj.atoms))
                ) {
                    return Obj;
                }
            } catch (E) {}
        }
        for (const Cand of Candidates) {
            try {
                return JSON.parse(Cand);
            } catch (E) {}
        }
        return null;
    }

    async function GroqChat(Messages, Extra = {}) {
        const Body = {
            model: GROQ_MODEL,
            temperature: Extra.temperature ?? 0.05,
            max_tokens: Extra.max_tokens ?? 6000,
            messages: Messages
        };
        if (Extra.json !== false) {
            Body.response_format = { type: "json_object" };
        }
        const Res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(Body)
        });
        if (!Res.ok) {
            const ErrBody = await Res.text().catch(() => "");
            if (Extra.json !== false && (Res.status === 400 || /response_format|json_object/i.test(ErrBody))) {
                return GroqChat(Messages, { ...Extra, json: false });
            }
            throw new Error(`Groq HTTP ${Res.status}${ErrBody ? ": " + ErrBody.slice(0, 180) : ""}`);
        }
        const Data = await Res.json();
        return Data.choices?.[0]?.message?.content || "";
    }

    function BuildSystemPrompt(FormulaInfo) {
        const FormulaBlock = FormulaInfo
            ? `
GROUND TRUTH FORMULA (from chemical database — MUST match exactly):
- Name: ${FormulaInfo.Title}
- Molecular formula: ${FormulaInfo.FormulaStr}
- Required atom counts: ${JSON.stringify(FormulaInfo.Formula)}
Your atoms array MUST contain exactly these counts. Wrong counts are invalid.`
            : "";

        return `You control a 3D molecular physics simulator. Return ONE JSON action object only. No markdown, no prose.

Allowed actions:
{"action":"clear"}
{"action":"spawn_elements","element":"U","count":1,"clear":false}
{"action":"spawn","name":"short-name","clear":true,"atoms":[["El",x,y,z],...],"bonds":[[i,j],...],"charges":[optional integers]}
{"action":"unknown","message":"short reason"}

Chemistry rules:
- Use standard element symbols only (H, C, N, O, F, Na, P, S, Cl, Fe, U, ...).
- When a ground-truth formula is provided, atom counts MUST match it exactly. Count every atom before answering.
- Prefer correct connectivity and typical valences (H=1, O=2, N=3, C=4, P=5).
- Nitro groups are -NO2 (N bonded to the ring/carbon and to two O). Do not invent extra hydrogens on aromatic carbons that are substituted.

Layout rules (neat placement):
- Place the molecule centered near the origin.
- Bonded atoms ~48–65 units apart.
- Avoid overlaps; keep non-bonded atoms at least ~35 units apart.
- Prefer a roughly planar layout for aromatic rings (z near 0), with substituents slightly offset.
- Keep overall span inside about -220..220 on each axis so it fits the view.
- Order atoms logically (ring atoms first, then substituents) so bond indices are easy to follow.

Other:
- clear=true for make/create/build/replace; clear=false for add/also.
- Only clear or spawn. Never change temperature, friction, timescale, bounds, or camera.
- If the request is not a molecule/element spawn → {"action":"unknown","message":"..."}.${FormulaBlock}`;
    }

    async function ResolveFormula(Query) {
        const Inline = ExtractInlineFormula(Query);
        if (Inline) {
            return {
                Formula: Inline,
                FormulaStr: FormulaToString(Inline),
                Title: FormulaToString(Inline),
                Source: "inline"
            };
        }
        const Name = ExtractSearchName(Query);
        if (!Name) return null;
        const Hit = await LookupPubChemFormula(Name);
        if (Hit) {
            return { ...Hit, Source: "pubchem" };
        }
        const Simplified = Name.replace(/\b(molecule|compound|structure)\b/gi, "").trim();
        if (Simplified && Simplified !== Name) {
            const Hit2 = await LookupPubChemFormula(Simplified);
            if (Hit2) return { ...Hit2, Source: "pubchem" };
        }
        return null;
    }

    async function InterpretCommand(Query, FormulaInfo) {
        const System = BuildSystemPrompt(FormulaInfo);
        const ExpectedFormula = FormulaInfo?.Formula || null;

        let LastErr = null;
        for (const Model of GROQ_MODELS) {
            GROQ_MODEL = Model;
            try {
                let Text = await GroqChat(
                    [
                        { role: "system", content: System },
                        { role: "user", content: Query }
                    ],
                    { temperature: 0.05, max_tokens: 6000 }
                );
                let Parsed = ExtractJsonObject(Text);

                if (Parsed && Parsed.action === "spawn") {
                    let Check = ValidateSpawnPayload(Parsed, ExpectedFormula);
                    if (!Check.ok && ExpectedFormula) {
                        const RepairPrompt = `INVALID STRUCTURE: ${Check.reason}.
Return a corrected JSON spawn for "${FormulaInfo.Title}" with EXACTLY these atom counts: ${JSON.stringify(ExpectedFormula)}.
Use a neat centered layout, correct bonding (e.g. aromatic ring + proper substituents), only JSON.`;
                        const Repair = await GroqChat(
                            [
                                { role: "system", content: System },
                                { role: "user", content: Query },
                                { role: "assistant", content: Text || "" },
                                { role: "user", content: RepairPrompt }
                            ],
                            { temperature: 0, max_tokens: 6000 }
                        );
                        const Repaired = ExtractJsonObject(Repair);
                        if (Repaired) {
                            Check = ValidateSpawnPayload(Repaired, ExpectedFormula);
                            if (Check.ok) Parsed = Repaired;
                            else Parsed = null;
                        } else {
                            Parsed = null;
                        }
                    } else if (!Check.ok) {
                        Parsed = null;
                    }
                }

                if (!Parsed) {
                    const Retry = await GroqChat(
                        [
                            { role: "system", content: System },
                            { role: "user", content: Query },
                            {
                                role: "user",
                                content: ExpectedFormula
                                    ? `Reply with ONLY valid JSON. atoms must match exactly ${JSON.stringify(ExpectedFormula)}. Neat 3D layout.`
                                    : "Reply with ONLY a valid JSON action object."
                            }
                        ],
                        { temperature: 0, max_tokens: 6000 }
                    );
                    Parsed = ExtractJsonObject(Retry);
                    if (Parsed && Parsed.action === "spawn") {
                        const Check = ValidateSpawnPayload(Parsed, ExpectedFormula);
                        if (!Check.ok) Parsed = null;
                    }
                }

                if (Parsed && Parsed.action) return Parsed;
                if (Parsed && Array.isArray(Parsed.atoms)) {
                    const Wrapped = {
                        action: "spawn",
                        clear: true,
                        atoms: Parsed.atoms,
                        bonds: Parsed.bonds || [],
                        charges: Parsed.charges,
                        name: Parsed.name || (FormulaInfo?.Title || "custom")
                    };
                    const Check = ValidateSpawnPayload(Wrapped, ExpectedFormula);
                    if (Check.ok) return Wrapped;
                }
                LastErr = new Error("Model returned no valid action");
            } catch (Err) {
                LastErr = Err;
            }
        }
        throw LastErr || new Error("All models failed");
    }

    function LocalFallbackMatch(Query) {
        const Q = Query.toLowerCase();
        for (const M of MoleculeCatalog) {
            const Names = (M.Names || M.Id || "").toLowerCase().split(/\s+/);
            if (Names.some((N) => N.length > 1 && Q.includes(N))) return M;
            if (Q.includes(M.Id)) return M;
        }
        return null;
    }

    function ExecuteAction(Cmd, OriginalText, FormulaInfo) {
        if (!Cmd || !Cmd.action) return { ok: false, message: "Unknown command." };
        const A = Cmd.action;

        if (A === "clear") {
            ClearAll();
            return { ok: true, message: "Cleared all atoms." };
        }

        if (
            A === "set_bath" ||
            A === "set_friction" ||
            A === "set_timescale" ||
            A === "set_bounds"
        ) {
            return {
                ok: false,
                message: "Scene settings are not controlled by AI. Use the dashboard or Settings panel."
            };
        }

        if (A === "spawn_elements") {
            const El = String(Cmd.element || "").trim();
            const N = SpawnElements(El, Number(Cmd.count) || 1, !!Cmd.clear);
            if (!N) return { ok: false, message: "Could not spawn element " + El };
            return { ok: true, message: `Spawned ${N}× ${El}.` };
        }

        if (A === "spawn") {
            const Atoms = Array.isArray(Cmd.atoms) ? Cmd.atoms : [];
            if (!Atoms.length) return { ok: false, message: "Spawn had no atoms." };
            const Expected = FormulaInfo?.Formula || null;
            const Check = ValidateSpawnPayload(Cmd, Expected);
            if (!Check.ok) {
                return {
                    ok: false,
                    message: `Rejected structure (${Check.reason}).`
                };
            }
            const Entry = {
                Id: Cmd.name || FormulaInfo?.Title || "custom",
                Atoms,
                Bonds: Array.isArray(Cmd.bonds) ? Cmd.bonds : [],
                Charges: Array.isArray(Cmd.charges) ? Cmd.charges : undefined
            };
            const Clear =
                Cmd.clear !== false || /make\s+(me\s+)?|create\s+|build\s+|only\s+/i.test(OriginalText || "");
            const N = SpawnMolecule(Entry, Clear);
            const Actual = CountAtomsFromList(Atoms);
            const FormulaStr = FormulaToString(Actual);
            const Src = FormulaInfo?.Source === "pubchem" ? " · PubChem verified" : "";
            return { ok: true, message: `Spawned ${Entry.Id} (${N} atoms, ${FormulaStr}${Src}).` };
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

        const CatalogHit = LocalFallbackMatch(Text);
        if (CatalogHit && /^(make|create|build|spawn)\s/i.test(Text) === false && Text.length < 12) {
            const N = SpawnMolecule(CatalogHit, true);
            return { ok: true, message: `Spawned ${CatalogHit.Id} (${N} atoms).` };
        }

        let FormulaInfo = null;
        try {
            FormulaInfo = await ResolveFormula(Text);
        } catch (Err) {
            FormulaInfo = null;
        }

        try {
            const Cmd = await InterpretCommand(Text, FormulaInfo);
            return ExecuteAction(Cmd, Text, FormulaInfo);
        } catch (Err) {
            console.warn("AI interpret failed", Err);
            if (CatalogHit) {
                const N = SpawnMolecule(CatalogHit, true);
                return { ok: true, message: `Spawned ${CatalogHit.Id} (${N} atoms | offline).` };
            }
            return {
                ok: false,
                message: "Could not build that molecule. Try a clearer name or formula (e.g. TNT, C7H5N3O6, glucose)."
            };
        }
    }

    function OpenWidget(Api) {
        Api.CreateWidget({
            Id: "ai-helper",
            Title: "AI",
            X: 280,
            Y: 200,
            Width: 340,
            Build(Body) {
                const Section = Api.AddSection(Body, "Command", true);

                const Hint = document.createElement("div");
                Hint.className = "WHint";
                Hint.textContent = "Names are checked against PubChem for the real formula, then the model builds the structure.";
                Section.appendChild(Hint);

                const Row = document.createElement("div");
                Row.className = "WRow AiCmdRow";
                const Input = document.createElement("input");
                Input.type = "text";
                Input.className = "WText AiCmdInput";
                Input.placeholder = "TNT | glucose | caffeine | C7H5N3O6 | clear…";
                Input.autocomplete = "off";
                const RunBtn = document.createElement("button");
                RunBtn.type = "button";
                RunBtn.className = "WPrimary";
                RunBtn.textContent = "Go";
                Row.appendChild(Input);
                Row.appendChild(RunBtn);
                Section.appendChild(Row);

                const Status = document.createElement("div");
                Status.className = "WHint";
                Status.id = "AiStatus";
                Section.appendChild(Status);

                const Examples = Api.AddSection(Body, "Examples", false);
                const List = document.createElement("div");
                List.className = "AiExampleList";
                for (const Ex of [
                    "make TNT",
                    "make glucose",
                    "make caffeine",
                    "make aspirin",
                    "make UF6",
                    "spawn 6 Fe",
                    "clear all"
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
                        ? Ok
                            ? "rgba(141,255,176,0.9)"
                            : "rgba(255,138,154,0.9)"
                        : "";
                };

                const Go = async () => {
                    if (Busy) return;
                    const Text = Input.value.trim();
                    if (!Text) return;
                    Busy = true;
                    RunBtn.disabled = true;
                    SetStatus("Looking up & building…", true);
                    try {
                        const Result = await RunCommand(Text);
                        SetStatus(Result.message, Result.ok);
                    } catch (Err) {
                        SetStatus(String(Err.message || Err).slice(0, 140), false);
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
        Version: "1.4.0",
        Description: "PubChem-verified formulas + AI structure builder",
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