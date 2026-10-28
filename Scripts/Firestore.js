import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import * as Firestore from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const FirebaseConfig = {
    apiKey: "AIzaSyDsPD5jOS_VNuH1tHKLr0cF1UlHzCKx1P0",
    authDomain: "mol-1af14.firebaseapp.com",
    projectId: "mol-1af14",
    storageBucket: "mol-1af14.firebasestorage.app",
    messagingSenderId: "55876687942",
    appId: "1:55876687942:web:260bcf58b36d4156671247"
};

const App = initializeApp(FirebaseConfig);
const Database = Firestore.getFirestore(App);

globalThis.FireStorage = class {
    constructor(Collection = "") {
        this.Collection = Collection;
    }

    async AppendDocument(DocumentData) {
        if (!this.Collection) return;
        const DocRef = await Firestore.addDoc(Firestore.collection(Database, this.Collection), DocumentData);
        return DocRef.id;
    }

    async GetDocument(DocumentId) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Database, this.Collection, DocumentId);
        const Snapshot = await Firestore.getDoc(DocRef);
        if (Snapshot.exists()) return { id: Snapshot.id, ...Snapshot.data() };
        return null;
    }

    async UpdateDocument(DocumentId, DocumentData) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Database, this.Collection, DocumentId);
        await Firestore.updateDoc(DocRef, DocumentData);
    }

    async DeleteDocument(DocumentId) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Database, this.Collection, DocumentId);
        await Firestore.deleteDoc(DocRef);
    }

    async GetDocuments(Query = {}) {
        if (!this.Collection) return [];
        const CollectionRef = Firestore.collection(Database, this.Collection);
        let QueryRef = CollectionRef;
        const Entries = Object.entries(Query || {});
        if (Entries.length) {
            QueryRef = Firestore.query(
                CollectionRef,
                ...Entries.map(([Key, Value]) => Firestore.where(Key, "==", Value))
            );
        }
        const QuerySnapshot = await Firestore.getDocs(QueryRef);
        return QuerySnapshot.docs.map(Doc => ({ id: Doc.id, ...Doc.data() }));
    }

    async GetDocumentsByField(FieldName, FieldValue) {
        if (!this.Collection) return [];
        const QueryRef = Firestore.query(
            Firestore.collection(Database, this.Collection),
            Firestore.where(FieldName, "==", FieldValue)
        );
        const QuerySnapshot = await Firestore.getDocs(QueryRef);
        return QuerySnapshot.docs.map(Doc => ({ id: Doc.id, ...Doc.data() }));
    }

    async GetAllDocuments(Limit = 40) {
        if (!this.Collection) return [];
        const QueryRef = Firestore.query(
            Firestore.collection(Database, this.Collection),
            Firestore.limit(Limit)
        );
        const QuerySnapshot = await Firestore.getDocs(QueryRef);
        return QuerySnapshot.docs.map(Doc => ({ id: Doc.id, ...Doc.data() }));
    }

    OnSnapshot(Callback) {
        if (!this.Collection) return () => {};
        const CollectionRef = Firestore.collection(Database, this.Collection);
        return Firestore.onSnapshot(CollectionRef, Snapshot => {
            Callback(Snapshot);
        });
    }

    OnDocumentSnapshot(DocumentId, Callback) {
        if (!this.Collection) return () => {};
        const DocRef = Firestore.doc(Database, this.Collection, DocumentId);
        return Firestore.onSnapshot(DocRef, Snapshot => {
            if (!Snapshot.exists()) return;
            Callback({ id: Snapshot.id, ...Snapshot.data() });
        });
    }
};

globalThis.Uuid = (Length = 16) => {
    if ((Length & (Length - 1)) !== 0 || Length < 2) return "";
    return Array.from({ length: Length }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).reduce((Acc, Char, Index) =>
        Acc + (Index && Index % (Length / 2) === 0 ? "-" : "") + Char, ""
    );
};

/* ——— Profile avatar (deterministic noise bitmap) ——— */
function HashString(Str) {
    let H = 2166136261 >>> 0;
    for (let i = 0; i < Str.length; i++) {
        H ^= Str.charCodeAt(i);
        H = Math.imul(H, 16777619);
    }
    return H >>> 0;
}

function Hash2(X, Y, Seed) {
    let H = Seed >>> 0;
    H = Math.imul(H ^ (X * 374761393), 1103515245);
    H = Math.imul(H ^ (Y * 668265263), 2246822519);
    H ^= H >>> 13;
    H = Math.imul(H, 1274126177);
    return ((H ^ (H >>> 16)) >>> 0) / 4294967296;
}

function SmoothNoise(X, Y, Seed) {
    const X0 = Math.floor(X), Y0 = Math.floor(Y);
    const Fx = X - X0, Fy = Y - Y0;
    const Sx = Fx * Fx * (3 - 2 * Fx);
    const Sy = Fy * Fy * (3 - 2 * Fy);
    const N00 = Hash2(X0, Y0, Seed);
    const N10 = Hash2(X0 + 1, Y0, Seed);
    const N01 = Hash2(X0, Y0 + 1, Seed);
    const N11 = Hash2(X0 + 1, Y0 + 1, Seed);
    const Nx0 = N00 + (N10 - N00) * Sx;
    const Nx1 = N01 + (N11 - N01) * Sx;
    return Nx0 + (Nx1 - Nx0) * Sy;
}

function Fbm(X, Y, Seed) {
    let V = 0, A = 0.5, F = 1;
    for (let O = 0; O < 5; O++) {
        V += SmoothNoise(X * F, Y * F, Seed + O * 1013) * A;
        A *= 0.5;
        F *= 2.05;
    }
    return V;
}

/** Generate a unique profile avatar as a data URL (PNG). Seed from name + id. */
globalThis.GenerateProfileAvatar = function(Name = "guest", Id = "", Size = 192) {
    const Seed = HashString(`${Name}::${Id}::mol-v2`);
    const Canvas = document.createElement("canvas");
    Canvas.width = Size;
    Canvas.height = Size;
    const Ctx = Canvas.getContext("2d");
    const Img = Ctx.createImageData(Size, Size);

    const Hue = Seed % 360;
    const HueB = (Hue + 120 + (Seed % 60)) % 360;
    const HueC = (Hue + 220 + ((Seed >> 5) % 40)) % 360;

    const hsl = (H, S, L) => {
        H = ((H % 360) + 360) % 360;
        const C = (1 - Math.abs(2 * L / 100 - 1)) * (S / 100);
        const X = C * (1 - Math.abs((H / 60) % 2 - 1));
        const M = L / 100 - C / 2;
        let R = 0, G = 0, B = 0;
        if (H < 60) { R = C; G = X; }
        else if (H < 120) { R = X; G = C; }
        else if (H < 180) { G = C; B = X; }
        else if (H < 240) { G = X; B = C; }
        else if (H < 300) { R = X; B = C; }
        else { R = C; B = X; }
        return [Math.round((R + M) * 255), Math.round((G + M) * 255), Math.round((B + M) * 255)];
    };

    const CX = Size * 0.5, CY = Size * 0.5;
    const Warp = 0.35 + (Seed % 40) / 100;

    for (let Y = 0; Y < Size; Y++) {
        for (let X = 0; X < Size; X++) {
            const U = X / Size, V = Y / Size;
            const Dx = U - 0.5, Dy = V - 0.5;
            const Dist = Math.sqrt(Dx * Dx + Dy * Dy);
            const Ang = Math.atan2(Dy, Dx);

            // Domain-warped fbm for organic plasma
            const W1 = Fbm(U * 3.2 + 0.4, V * 3.2, Seed) - 0.5;
            const W2 = Fbm(U * 3.2 - 1.1, V * 3.2 + 0.7, Seed ^ 0x55) - 0.5;
            const N = Fbm(U * 4 + W1 * Warp * 2, V * 4 + W2 * Warp * 2, Seed ^ 0xA11);
            const N2 = Fbm(U * 7.5 + N, V * 7.5 - N, Seed ^ 0xC0FFEE);
            const Ridge = 1 - Math.abs(N2 * 2 - 1);

            // Soft orb + rim light + inner glow
            const Orb = 1 - smoothstep(0.38, 0.5, Dist);
            const Rim = Math.exp(-Math.pow((Dist - 0.34) * 10, 2));
            const Spiral = Math.sin(Ang * 3 + N * 6 + Dist * 8) * 0.5 + 0.5;

            const Mix = N * 0.45 + Ridge * 0.3 + Spiral * 0.15 + Rim * 0.25;
            const H = Hue + Mix * 70 + N2 * 40;
            const S = 58 + Mix * 25;
            const L = 22 + Mix * 42 + (1 - Dist) * 12;
            const [R, G, B] = hsl(H, S, Math.max(6, Math.min(86, L)));

            // Secondary color veins
            const Vein = Math.pow(Math.max(0, N2 - 0.55), 1.4);
            const [R2, G2, B2] = hsl(HueB, 70, 55);
            const Rf = R + (R2 - R) * Vein * 0.55;
            const Gf = G + (G2 - G) * Vein * 0.55;
            const Bf = B + (B2 - B) * Vein * 0.55;

            const Spark = Math.pow(Math.max(0, Fbm(U * 18, V * 18, Seed ^ 99) - 0.72), 2);
            const [Rs, Gs, Bs] = hsl(HueC, 80, 75);

            const I = (Y * Size + X) * 4;
            const A = Math.round(255 * Math.max(0, Math.min(1, Orb)));
            Img.data[I] = Math.min(255, Rf * (1 - Spark) + Rs * Spark * 2);
            Img.data[I + 1] = Math.min(255, Gf * (1 - Spark) + Gs * Spark * 2);
            Img.data[I + 2] = Math.min(255, Bf * (1 - Spark) + Bs * Spark * 2);
            Img.data[I + 3] = A;
        }
    }
    Ctx.putImageData(Img, 0, 0);

    // Soft vignette circle clip already via alpha; add subtle highlight arc
    const Grad = Ctx.createRadialGradient(CX * 0.7, CY * 0.65, Size * 0.05, CX, CY, Size * 0.48);
    Grad.addColorStop(0, "rgba(255,255,255,0.22)");
    Grad.addColorStop(0.45, "rgba(255,255,255,0.05)");
    Grad.addColorStop(1, "rgba(0,0,0,0.25)");
    Ctx.globalCompositeOperation = "source-atop";
    Ctx.fillStyle = Grad;
    Ctx.beginPath();
    Ctx.arc(CX, CY, Size * 0.48, 0, Math.PI * 2);
    Ctx.fill();
    Ctx.globalCompositeOperation = "source-over";

    // Monogram
    const Letter = (Name || "?").trim().charAt(0).toUpperCase() || "?";
    Ctx.font = `700 ${Math.floor(Size * 0.4)}px Cascadia Mono, ui-monospace, system-ui, sans-serif`;
    Ctx.textAlign = "center";
    Ctx.textBaseline = "middle";
    Ctx.lineWidth = Size * 0.045;
    Ctx.strokeStyle = "rgba(0,0,0,0.35)";
    Ctx.fillStyle = "rgba(255,255,255,0.92)";
    Ctx.strokeText(Letter, CX, CY + Size * 0.02);
    Ctx.fillText(Letter, CX, CY + Size * 0.02);

    return Canvas.toDataURL("image/png");
};

function smoothstep(E0, E1, X) {
    const T = Math.max(0, Math.min(1, (X - E0) / (E1 - E0)));
    return T * T * (3 - 2 * T);
}

/* ——— Mol cloud accounts & scenes ——— */
const Profiles = new globalThis.FireStorage("Profiles");
const Scenes = new globalThis.FireStorage("Scenes");
const SESSION_KEY = "mol.session.v1";

globalThis.MolCloud = {
    User: null,

    LoadSession() {
        try {
            const Raw = localStorage.getItem(SESSION_KEY);
            if (!Raw) return null;
            const Data = JSON.parse(Raw);
            if (Data && Data.id && Data.Name) {
                this.User = Data;
                return Data;
            }
        } catch (Err) {}
        return null;
    },

    SaveSession(User) {
        this.User = User;
        if (User) localStorage.setItem(SESSION_KEY, JSON.stringify({
            id: User.id,
            Name: User.Name
        }));
        else localStorage.removeItem(SESSION_KEY);
    },

    async CreateAccount(Name, Password) {
        Name = String(Name || "").trim();
        Password = String(Password || "");
        if (Name.length < 2) throw new Error("Name must be at least 2 characters");
        if (Password.length < 3) throw new Error("Password must be at least 3 characters");
        const Existing = await Profiles.GetDocumentsByField("Name", Name);
        if (Existing && Existing.length) throw new Error("That name is already taken");
        const Id = await Profiles.AppendDocument({
            Name,
            Password,
            Settings: {},
            Created: Date.now()
        });
        const User = { id: Id, Name };
        this.SaveSession(User);
        return User;
    },

    async Login(Name, Password) {
        Name = String(Name || "").trim();
        Password = String(Password || "");
        const Matches = await Profiles.GetDocumentsByField("Name", Name);
        if (!Matches || !Matches.length) throw new Error("Account not found");
        const Acc = Matches.find((M) => M.Password === Password);
        if (!Acc) throw new Error("Wrong password");
        const User = { id: Acc.id, Name: Acc.Name };
        this.SaveSession(User);
        return User;
    },

    Logout() {
        this.SaveSession(null);
    },

    SerializeScene() {
        if (typeof Objects === "undefined") return { Atoms: [], Bonds: [] };
        const Atoms = [];
        for (let i = 0; i < Objects.length; i++) {
            const Obj = Objects[i];
            if (!Obj) continue;
            Atoms.push({
                Tag: `${i}${Obj.Key}`,
                Key: Obj.Key,
                P: [Obj.Position[0], Obj.Position[1], Obj.Position[2]],
                V: [Obj.Velocity[0], Obj.Velocity[1], Obj.Velocity[2]],
                C: Obj.ExtraCharge || 0
            });
        }
        const Bonds = [];
        const R = globalThis.CanvasRenderer;
        if (R && R.ForcedBonds) {
            for (const K of R.ForcedBonds) Bonds.push(K);
        } else if (R && R.ActiveBondPairs) {
            for (const K of R.ActiveBondPairs) Bonds.push(K);
        }
        return { Atoms, Bonds };
    },


    GenerateSceneThumbnail(SceneLike, Size = 96) {
        const Canvas = document.createElement("canvas");
        Canvas.width = Size;
        Canvas.height = Size;
        const Ctx = Canvas.getContext("2d");
        Ctx.clearRect(0, 0, Size, Size);

        // Soft background
        const Bg = Ctx.createRadialGradient(Size * 0.5, Size * 0.45, 2, Size * 0.5, Size * 0.5, Size * 0.65);
        Bg.addColorStop(0, "rgba(40, 48, 64, 0.95)");
        Bg.addColorStop(1, "rgba(12, 14, 20, 0.95)");
        Ctx.fillStyle = Bg;
        Ctx.beginPath();
        Ctx.arc(Size * 0.5, Size * 0.5, Size * 0.48, 0, Math.PI * 2);
        Ctx.fill();

        const Raw = Array.isArray(SceneLike?.AtomData) && SceneLike.AtomData.length
            ? SceneLike.AtomData
            : (Array.isArray(SceneLike?.Atoms) ? SceneLike.Atoms.map((Tag, i) => {
                const M = String(Tag).match(/([A-Za-z]+)/);
                return { Key: M ? M[1] : "H", P: [Math.cos(i) * 30, 0, Math.sin(i) * 30] };
            }) : []);

        if (!Raw.length) {
            Ctx.fillStyle = "rgba(255,255,255,0.25)";
            Ctx.font = `600 ${Math.floor(Size * 0.22)}px system-ui,sans-serif`;
            Ctx.textAlign = "center";
            Ctx.textBaseline = "middle";
            Ctx.fillText("empty", Size * 0.5, Size * 0.5);
            return Canvas.toDataURL("image/png");
        }

        const Pts = Raw.map((A, i) => {
            const P = A.P || [0, 0, 0];
            return {
                Key: A.Key || "H",
                X: P[0] || 0,
                Y: P[1] || 0,
                Z: P[2] || 0
            };
        });

        let MinX = Infinity, MaxX = -Infinity, MinZ = Infinity, MaxZ = -Infinity, MinY = Infinity, MaxY = -Infinity;
        for (const P of Pts) {
            MinX = Math.min(MinX, P.X); MaxX = Math.max(MaxX, P.X);
            MinZ = Math.min(MinZ, P.Z); MaxZ = Math.max(MaxZ, P.Z);
            MinY = Math.min(MinY, P.Y); MaxY = Math.max(MaxY, P.Y);
        }
        const SpanX = Math.max(40, MaxX - MinX);
        const SpanZ = Math.max(40, MaxZ - MinZ);
        const Span = Math.max(SpanX, SpanZ) * 1.25;
        const CX = (MinX + MaxX) * 0.5;
        const CZ = (MinZ + MaxZ) * 0.5;

        // Depth sort
        Pts.sort((A, B) => (A.Y + A.Z) - (B.Y + B.Z));

        const Colors = globalThis.ElementColors || {};
        for (const P of Pts) {
            const U = 0.5 + (P.X - CX) / Span;
            const V = 0.5 + (P.Z - CZ) / Span - P.Y * 0.002;
            const Sx = U * Size;
            const Sy = V * Size;
            const R = Math.max(3, Math.min(Size * 0.12, 10 - Pts.length * 0.05));
            let Col = Colors[P.Key];
            if (!Col) Col = [0.7, 0.7, 0.75];
            const [Cr, Cg, Cb] = Col;
            const Grad = Ctx.createRadialGradient(Sx - R * 0.3, Sy - R * 0.3, R * 0.1, Sx, Sy, R);
            Grad.addColorStop(0, `rgba(${Math.min(255, Cr * 255 + 40)},${Math.min(255, Cg * 255 + 40)},${Math.min(255, Cb * 255 + 40)},0.95)`);
            Grad.addColorStop(1, `rgba(${Cr * 180},${Cg * 180},${Cb * 180},0.9)`);
            Ctx.beginPath();
            Ctx.arc(Sx, Sy, R, 0, Math.PI * 2);
            Ctx.fillStyle = Grad;
            Ctx.fill();
            Ctx.strokeStyle = "rgba(0,0,0,0.25)";
            Ctx.lineWidth = 1;
            Ctx.stroke();
        }

        return Canvas.toDataURL("image/png");
    },

    IsOwner(SceneDoc) {
        return !!(this.User && SceneDoc && SceneDoc.OwnerId === this.User.id);
    },

    async RenameScene(SceneId, Title) {
        if (!this.User) throw new Error("Log in first");
        const Doc = await Scenes.GetDocument(SceneId);
        if (!Doc) throw new Error("Scene not found");
        if (!this.IsOwner(Doc)) throw new Error("Only the owner can rename this scene");
        Title = String(Title || "").trim().slice(0, 80);
        if (!Title) throw new Error("Title required");
        await Scenes.UpdateDocument(SceneId, { Title });
        return Title;
    },

    async DeleteScene(SceneId) {
        if (!this.User) throw new Error("Log in first");
        const Doc = await Scenes.GetDocument(SceneId);
        if (!Doc) throw new Error("Scene not found");
        if (!this.IsOwner(Doc)) throw new Error("Only the owner can delete this scene");
        await Scenes.DeleteDocument(SceneId);
    },

    async SaveAsScene(SceneId) {
        if (!this.User) throw new Error("Log in first");
        const Doc = await Scenes.GetDocument(SceneId);
        if (!Doc) throw new Error("Scene not found");
        if (!this.IsOwner(Doc)) throw new Error("Only the owner can overwrite this scene");
        const Payload = this.SerializeScene();
        if (!Payload.Atoms.length) throw new Error("Nothing to save");
        const AtomTags = Payload.Atoms.map((A, i) => A.Tag || `${i}${A.Key}`);
        const Thumb = this.GenerateSceneThumbnail({ AtomData: Payload.Atoms });
        await Scenes.UpdateDocument(SceneId, {
            Atoms: AtomTags,
            AtomData: Payload.Atoms,
            Bonds: Payload.Bonds,
            Thumb,
            Updated: Date.now()
        });
        return SceneId;
    },

    async PublishScene(Title = "Untitled") {
        if (!this.User) throw new Error("Log in to publish a scene");
        const Payload = this.SerializeScene();
        if (!Payload.Atoms.length) throw new Error("Nothing to publish — spawn some atoms first");
        // Compact legacy-friendly arrays for the console layout you showed
        const AtomTags = Payload.Atoms.map((A, i) => A.Tag || `${i}${A.Key}`);
        const Thumb = this.GenerateSceneThumbnail({ AtomData: Payload.Atoms });
        const Id = await Scenes.AppendDocument({
            Title: String(Title || "Untitled").slice(0, 80),
            OwnerId: this.User.id,
            OwnerName: this.User.Name,
            Atoms: AtomTags,
            AtomData: Payload.Atoms,
            Bonds: Payload.Bonds,
            Thumb,
            Comments: [],
            Rating: 0,
            RatingSum: 0,
            RatingCount: 0,
            Created: Date.now()
        });
        return Id;
    },

    async ListScenes(Limit = 30) {
        const All = await Scenes.GetAllDocuments(Limit);
        All.sort((A, B) => (B.Created || 0) - (A.Created || 0));
        return All;
    },

    async LoadScene(SceneId) {
        const Doc = await Scenes.GetDocument(SceneId);
        if (!Doc) throw new Error("Scene not found");
        return Doc;
    },

    ApplyScene(Doc) {
        if (!Doc) return;
        if (typeof Objects !== "undefined") Objects.length = 0;
        const R = globalThis.CanvasRenderer;
        if (R) {
            R.ForcedBonds?.clear();
            R.ActiveBondPairs?.clear();
            R.BondData?.clear();
            R.BondsDirty = true;
        }
        const Data = Array.isArray(Doc.AtomData) && Doc.AtomData.length
            ? Doc.AtomData
            : (Doc.Atoms || []).map((Tag) => {
                const M = String(Tag).match(/^(\d+)?([A-Za-z]+)/);
                return { Key: M ? M[2] : "H", P: [0, 0, 0], V: [0, 0, 0], C: 0 };
            });
        // Spread if only tags without positions
        const NeedLayout = Data.every((A) => !A.P || (A.P[0] === 0 && A.P[1] === 0 && A.P[2] === 0));
        for (let i = 0; i < Data.length; i++) {
            const A = Data[i];
            let P = A.P || [0, 0, 0];
            if (NeedLayout) {
                const Ang = (i / Math.max(1, Data.length)) * Math.PI * 2;
                P = [Math.cos(Ang) * 40, (i % 3 - 1) * 12, Math.sin(Ang) * 40];
            }
            if (typeof Atom === "function") {
                const Obj = Atom(A.Key || "H", P, A.V || [0, 0, 0]);
                if (Obj && A.C) Obj.ExtraCharge = A.C;
            }
        }
        if (R && Array.isArray(Doc.Bonds)) {
            for (const K of Doc.Bonds) {
                // Bonds may be "0H-2O" or "0_2"
                const Parts = String(K).split("-");
                if (Parts.length === 2 && /^\d+$/.test(Parts[0]) && /^\d+$/.test(Parts[1])) {
                    R.ForcedBonds.add(`${Parts[0]}_${Parts[1]}`);
                } else {
                    const Ma = Parts[0].match(/^(\d+)/);
                    const Mb = Parts[1] && Parts[1].match(/^(\d+)/);
                    if (Ma && Mb) R.ForcedBonds.add(`${Ma[1]}_${Mb[1]}`);
                    else R.ForcedBonds.add(K);
                }
            }
            R.SettleFrames = Math.max(R.SettleFrames || 0, 160);
            R.BondsDirty = true;
        }
        if (typeof UpdateHierarchy === "function") UpdateHierarchy(true);
    },

    async RateScene(SceneId, Stars) {
        if (!this.User) throw new Error("Log in to rate");
        Stars = Math.max(0, Math.min(5, Math.round(Number(Stars) || 0)));
        const Doc = await Scenes.GetDocument(SceneId);
        if (!Doc) throw new Error("Scene not found");
        const Sum = (Doc.RatingSum || 0) + Stars;
        const Count = (Doc.RatingCount || 0) + 1;
        const Rating = Sum / Count;
        await Scenes.UpdateDocument(SceneId, {
            RatingSum: Sum,
            RatingCount: Count,
            Rating
        });
        return Rating;
    },

    async CommentScene(SceneId, Text) {
        if (!this.User) throw new Error("Log in to comment");
        Text = String(Text || "").trim().slice(0, 280);
        if (!Text) throw new Error("Empty comment");
        const Doc = await Scenes.GetDocument(SceneId);
        if (!Doc) throw new Error("Scene not found");
        const Comments = Array.isArray(Doc.Comments) ? Doc.Comments.slice() : [];
        Comments.unshift({
            Name: this.User.Name,
            OwnerId: this.User.id,
            Text,
            T: Date.now()
        });
        if (Comments.length > 50) Comments.length = 50;
        await Scenes.UpdateDocument(SceneId, { Comments });
        return Comments;
    }
};

// Restore session early
globalThis.MolCloud.LoadSession();