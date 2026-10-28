(function AiHelperPlugin() {
    // NOTE: rotate this key if it was ever committed publicly
    const GROQ_API_KEY = `${"gsk_"}${"zlpe8ckeeBSowWvIASzR"}${"WGdyb3FYhkMoxCCPrEWV"}${"G7cYzDmtN6cY"}`;
    const GROQ_MODELS = [
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b"
    ];
    let GROQ_MODEL = GROQ_MODELS[1];

    // Offline fallback catalog only — AI is free to invent any structure
    const MoleculeCatalog = [
        {
            Id: "h2",
            Names: "hydrogen H2 dihydrogen H-H",
            Atoms: [["H", -35, 0, 0], ["H", 35, 0, 0]],
            Bonds: [[0, 1]]
        },
        {
            Id: "h2o",
            Names: "water H2O dihydrogen monoxide",
            Atoms: [["O", 0, 0, 0], ["H", 55, 40, 0], ["H", -55, 40, 0]],
            Bonds: [[0, 1], [0, 2]]
        },
        {
            Id: "ch4",
            Names: "methane CH4 natural gas",
            Atoms: [["C", 0, 0, 0], ["H", 55, 55, 55], ["H", -55, -55, 55], ["H", 55, -55, -55], ["H", -55, 55, -55]],
            Bonds: [[0, 1], [0, 2], [0, 3], [0, 4]]
        },
        {
            Id: "co2",
            Names: "carbon dioxide CO2 O=C=O",
            Atoms: [["O", -70, 0, 0], ["C", 0, 0, 0], ["O", 70, 0, 0]],
            Bonds: [[0, 1], [1, 2]]
        },
        {
            Id: "nh3",
            Names: "ammonia NH3",
            Atoms: [["N", 0, 0, 0], ["H", 55, 40, 20], ["H", -55, 40, 20], ["H", 0, -50, 20]],
            Bonds: [[0, 1], [0, 2], [0, 3]]
        },
        {
            Id: "nacl",
            Names: "sodium chloride NaCl table salt rock salt",
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
            // Accept any element the simulator knows; unknown keys still spawn as generic
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
            R.SettleFrames = Math.max(R.SettleFrames || 0, 90);
            R.Temperature = Math.min(R.Temperature ?? 0.35, 0.12);
        }
        return Indices.length;
    }

    function SpawnElements(Key, Count, ClearFirst) {
        if (ClearFirst) ClearAll();
        if (typeof globalThis.Atom !== "function") return 0;
        Key = String(Key || "").trim();
        if (!Key) return 0;
        // No whitelist — any element the Atom() factory accepts
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

    // Only hardcode clear. Everything else goes to the model.
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
                    (Object.prototype.hasOwnProperty.call(Obj, "id") ||
                        Object.prototype.hasOwnProperty.call(Obj, "action") ||
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
            temperature: Extra.temperature ?? 0.15,
            max_tokens: Extra.max_tokens ?? 4000,
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

    async function InterpretCommand(Query) {
        // No element whitelist. No scene controls. AI invents the structure.
        const System = `You control a 3D molecular physics simulator. Convert the user request into ONE JSON action object. No markdown, no prose, no commentary.

Allowed actions ONLY:
{"action":"clear"}
{"action":"spawn_elements","element":"U","count":1,"clear":false}
{"action":"spawn","name":"optional","clear":true,"atoms":[["El",x,y,z],...],"bonds":[[i,j],...],"charges":[optional parallel array of net charges]}
{"action":"unknown","message":"short reason"}

Rules:
- Only clear or spawn. Never change bath, friction, timescale, bounds, camera, or any other setting.
- Any element symbol is allowed (H through Og, including U, Pu, Au, etc.). Use standard chemical symbols.
- For "make X molecule / spawn ATP / create caffeine / build uranium hexafluoride / ..." return a spawn action with a realistic compact 3D layout.
- atoms: array of [symbol, x, y, z]. Coordinates roughly in -400..400 so the molecule fits in view. Prefer ~1.0–1.6 Å scaled (~40–70 units between bonded atoms).
- bonds: array of [indexA, indexB] into the atoms array. Include every covalent/ionic connection you intend.
- charges: optional parallel array of integer net charges (e.g. [1,-1] for NaCl).
- clear=true when the user says make / create / replace / only / build a molecule; clear=false when they say add / also spawn.
- Prefer a full atom+bond geometry over vague names. The simulator does not look up a catalog for AI spawns.
- Large molecules (ATP, DNA base, proteins fragments, etc.) are allowed; keep total atoms reasonable for real-time physics (aim under ~120 if possible, but do not refuse solely for size).
- If the request is purely about temperature, friction, speed, bounds, UI, or anything non-spawn → {"action":"unknown","message":"..."}.
- If truly impossible or nonsense → unknown with a short reason.`;

        let LastErr = null;
        for (const Model of GROQ_MODELS) {
            GROQ_MODEL = Model;
            try {
                const Text = await GroqChat(
                    [
                        { role: "system", content: System },
                        { role: "user", content: Query }
                    ],
                    { temperature: 0.15, max_tokens: 4000 }
                );
                let Parsed = ExtractJsonObject(Text);
                if (!Parsed) {
                    const Retry = await GroqChat(
                        [
                            { role: "system", content: System },
                            { role: "user", content: Query },
                            { role: "assistant", content: Text || "" },
                            { role: "user", content: "Reply with ONLY a valid JSON action object from the schema." }
                        ],
                        { temperature: 0 }
                    );
                    Parsed = ExtractJsonObject(Retry);
                }
                if (Parsed && Parsed.action) return Parsed;
                if (Parsed && Array.isArray(Parsed.atoms)) {
                    return {
                        action: "spawn",
                        clear: true,
                        atoms: Parsed.atoms,
                        bonds: Parsed.bonds || [],
                        charges: Parsed.charges,
                        name: Parsed.name || "custom"
                    };
                }
                if (Parsed && Parsed.id) {
                    return { action: "spawn_id", id: Parsed.id, clear: true };
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

    function ExecuteAction(Cmd, OriginalText) {
        if (!Cmd || !Cmd.action) return { ok: false, message: "Unknown command." };
        const A = Cmd.action;

        if (A === "clear") {
            ClearAll();
            return { ok: true, message: "Cleared all atoms." };
        }

        // Intentionally ignore scene-control actions if a model still emits them
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

        if (A === "spawn_id") {
            const Entry = MoleculeCatalog.find((M) => M.Id === Cmd.id);
            if (!Entry) return { ok: false, message: "Unknown molecule id (offline catalog only)." };
            const N = SpawnMolecule(Entry, Cmd.clear !== false);
            return { ok: true, message: `Spawned ${Entry.Id} (${N} atoms).` };
        }

        if (A === "spawn") {
            const Atoms = Array.isArray(Cmd.atoms) ? Cmd.atoms : [];
            if (!Atoms.length) return { ok: false, message: "Spawn had no atoms." };
            const Entry = {
                Id: Cmd.name || "custom",
                Atoms,
                Bonds: Array.isArray(Cmd.bonds) ? Cmd.bonds : [],
                Charges: Array.isArray(Cmd.charges) ? Cmd.charges : undefined
            };
            const Clear =
                Cmd.clear !== false || /make\s+(me\s+)?|create\s+|build\s+|only\s+/i.test(OriginalText || "");
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
                message: "Could not run that. Try: clear all | make water | make ATP | spawn 5 U"
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
                Hint.textContent = "Natural language molecule spawn. clear is the only hardcoded command.";
                Section.appendChild(Hint);

                const Row = document.createElement("div");
                Row.className = "WRow AiCmdRow";
                const Input = document.createElement("input");
                Input.type = "text";
                Input.className = "WText AiCmdInput";
                Input.placeholder = "make ATP | spawn uranium | clear all…";
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
                    "make water",
                    "make ATP molecule",
                    "spawn 8 U",
                    "create caffeine",
                    "build UF6",
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
                    SetStatus("Working…", true);
                    try {
                        const Result = await RunCommand(Text);
                        SetStatus(Result.message, Result.ok);
                    } catch (Err) {
                        SetStatus(String(Err.message || Err).slice(0, 120), false);
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
        Version: "1.1.0",
        Description: "Natural-language molecule spawner (clear only hardcoded)",
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