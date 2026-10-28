(function ScenesPlugin() {
    function EscapeHtml(S) {
        return String(S).replace(/[&<>"']/g, (C) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[C]);
    }

    function StarsHtml(Rating) {
        const R = Math.max(0, Math.min(5, Number(Rating) || 0));
        let H = "";
        for (let i = 1; i <= 5; i++) {
            H += `<button type="button" class="StarBtn${i <= Math.round(R) ? " On" : ""}" data-star="${i}" aria-label="${i} stars">★</button>`;
        }
        return H;
    }

    function ThumbSrc(S) {
        if (S.Thumb) return S.Thumb;
        if (globalThis.MolCloud?.GenerateSceneThumbnail) {
            return globalThis.MolCloud.GenerateSceneThumbnail(S, 96);
        }
        return "";
    }

    function IsOwner(S) {
        return !!(globalThis.MolCloud?.User && S && S.OwnerId === globalThis.MolCloud.User.id);
    }

    function OpenWidget(Api) {
        let ActiveSceneId = null;
        let OpenMenu = null;

        function CloseMenus() {
            if (OpenMenu) {
                OpenMenu.remove();
                OpenMenu = null;
            }
        }

        function OwnerCogMenu(Anchor, SceneId, Status, OnChanged) {
            CloseMenus();
            const Menu = document.createElement("div");
            Menu.className = "SceneCogMenu";
            Menu.innerHTML = `
                <button type="button" data-act="rename">Rename</button>
                <button type="button" data-act="saveas">Save as (overwrite)</button>
                <button type="button" data-act="delete" class="Danger">Delete</button>
            `;
            const Rect = Anchor.getBoundingClientRect();
            const Host = Anchor.closest(".PluginWidget") || document.body;
            Host.appendChild(Menu);
            const HostRect = Host.getBoundingClientRect();
            Menu.style.left = Math.min(Host.clientWidth - 160, Math.max(8, Rect.left - HostRect.left)) + "px";
            Menu.style.top = Math.min(Host.clientHeight - 120, Rect.bottom - HostRect.top + 4) + "px";
            OpenMenu = Menu;

            Menu.addEventListener("click", async (Event) => {
                const Btn = Event.target.closest("button[data-act]");
                if (!Btn) return;
                const Act = Btn.dataset.act;
                CloseMenus();
                try {
                    if (Act === "rename") {
                        const Cur = (await globalThis.MolCloud.LoadScene(SceneId))?.Title || "";
                        const Next = window.prompt("New title", Cur);
                        if (Next == null) return;
                        await globalThis.MolCloud.RenameScene(SceneId, Next);
                        Status.textContent = "Renamed.";
                    } else if (Act === "saveas") {
                        await globalThis.MolCloud.SaveAsScene(SceneId);
                        Status.textContent = "Scene overwritten with current sim.";
                    } else if (Act === "delete") {
                        if (!window.confirm("Delete this scene permanently?")) return;
                        await globalThis.MolCloud.DeleteScene(SceneId);
                        Status.textContent = "Scene deleted.";
                        ActiveSceneId = null;
                    }
                    if (OnChanged) await OnChanged();
                } catch (Err) {
                    Status.textContent = Err.message || String(Err);
                }
            });
        }

        Api.CreateWidget({
            Id: "scenes",
            Title: "Scene Browser",
            X: 72,
            Y: 72,
            Width: 400,
            OnClose() {
                CloseMenus();
            },
            Build(Body) {
                const Publish = Api.AddSection(Body, "Publish", true);
                const Browse = Api.AddSection(Body, "Browse", true);
                const Detail = Api.AddSection(Body, "Selected", true);

                const TitleRow = document.createElement("div");
                TitleRow.className = "WRow";
                TitleRow.innerHTML = `<label>Title</label>`;
                const TitleIn = document.createElement("input");
                TitleIn.type = "text";
                TitleIn.className = "WText";
                TitleIn.placeholder = "My molecule";
                TitleIn.maxLength = 80;
                TitleRow.appendChild(TitleIn);
                Publish.appendChild(TitleRow);

                const PubActions = document.createElement("div");
                PubActions.className = "WActions";
                const PubBtn = document.createElement("button");
                PubBtn.className = "WPrimary";
                PubBtn.textContent = "Publish current scene";
                const Status = document.createElement("div");
                Status.className = "WHint";
                Status.id = "ScenesStatus";
                PubBtn.addEventListener("click", async () => {
                    try {
                        if (!globalThis.MolCloud?.User) {
                            Status.textContent = "Log in from Settings first.";
                            return;
                        }
                        const Id = await globalThis.MolCloud.PublishScene(TitleIn.value || "Untitled");
                        Status.textContent = `Published (${Id}).`;
                        await LoadList();
                    } catch (Err) {
                        Status.textContent = Err.message || String(Err);
                    }
                });
                PubActions.appendChild(PubBtn);
                Publish.appendChild(PubActions);
                Publish.appendChild(Status);

                const Toolbar = document.createElement("div");
                Toolbar.className = "WActions";
                const RefreshBtn = document.createElement("button");
                RefreshBtn.className = "WPrimary";
                RefreshBtn.textContent = "Refresh";
                Toolbar.appendChild(RefreshBtn);
                Browse.appendChild(Toolbar);

                const List = document.createElement("div");
                List.className = "SceneList SceneListWide";
                Browse.appendChild(List);

                const DetailBox = document.createElement("div");
                DetailBox.className = "SceneDetail";
                DetailBox.innerHTML = `<div class="SceneEmpty">Select a scene to rate or comment.</div>`;
                Detail.appendChild(DetailBox);

                Body.addEventListener("pointerdown", (Event) => {
                    if (OpenMenu && !Event.target.closest(".SceneCogMenu, .SceneCogBtn")) CloseMenus();
                });

                async function LoadList() {
                    List.innerHTML = `<div class="SceneEmpty">Loading…</div>`;
                    try {
                        const Scenes = await globalThis.MolCloud.ListScenes(30);
                        if (!Scenes.length) {
                            List.innerHTML = `<div class="SceneEmpty">No public scenes yet.</div>`;
                            return;
                        }
                        List.innerHTML = "";
                        for (const S of Scenes) {
                            const Card = document.createElement("div");
                            Card.className = "SceneCard";
                            Card.dataset.id = S.id;
                            const Rating = S.Rating || 0;
                            const Count = S.RatingCount || 0;
                            const AtomN = Array.isArray(S.AtomData) ? S.AtomData.length
                                : (Array.isArray(S.Atoms) ? S.Atoms.length : 0);
                            const Thumb = ThumbSrc(S);
                            const Owner = IsOwner(S);
                            Card.innerHTML = `
                                <div class="SceneCardRow">
                                    <img class="SceneThumb" src="${Thumb}" alt="" width="48" height="48">
                                    <div class="SceneCardTop">
                                        <div class="SceneTitle">${EscapeHtml(S.Title || "Untitled")}</div>
                                        <div class="SceneMeta">${EscapeHtml(S.OwnerName || "anon")} · ${AtomN} atoms · ${Rating.toFixed(1)}★ (${Count})</div>
                                    </div>
                                </div>
                                <div class="SceneCardActions">
                                    <button type="button" class="SceneLoad" data-id="${S.id}">Load</button>
                                    <button type="button" class="SceneOpen" data-id="${S.id}">Details</button>
                                    ${Owner ? `<button type="button" class="SceneCogBtn" data-id="${S.id}" title="Owner options" aria-label="Owner options">⚙</button>` : ""}
                                </div>
                            `;
                            List.appendChild(Card);
                        }
                    } catch (Err) {
                        List.innerHTML = `<div class="SceneEmpty">${EscapeHtml(Err.message || String(Err))}</div>`;
                    }
                }

                async function ShowDetail(Id) {
                    ActiveSceneId = Id;
                    DetailBox.innerHTML = `<div class="SceneEmpty">Loading…</div>`;
                    try {
                        const S = await globalThis.MolCloud.LoadScene(Id);
                        const Rating = S.Rating || 0;
                        const Comments = Array.isArray(S.Comments) ? S.Comments : [];
                        const Thumb = ThumbSrc(S);
                        const Owner = IsOwner(S);
                        DetailBox.innerHTML = `
                            <div class="SceneDetailHeader">
                                <img class="SceneThumb SceneThumbLg" src="${Thumb}" alt="" width="72" height="72">
                                <div>
                                    <div class="SceneTitle">${EscapeHtml(S.Title || "Untitled")}</div>
                                    <div class="SceneMeta">by ${EscapeHtml(S.OwnerName || "anon")}</div>
                                    ${Owner ? `<button type="button" class="SceneCogBtn" data-id="${S.id}" title="Owner options">⚙ Manage</button>` : ""}
                                </div>
                            </div>
                            <div class="SceneStars" data-id="${S.id}">${StarsHtml(Rating)}</div>
                            <div class="SceneCommentForm">
                                <input type="text" class="WText SceneCommentInput" placeholder="Write a comment…" maxlength="280">
                                <button type="button" class="WPrimary SceneCommentSend" data-id="${S.id}">Post</button>
                            </div>
                            <div class="SceneCommentsFull">
                                ${Comments.length
                                    ? Comments.map((C) =>
                                        `<div class="SceneComment"><strong>${EscapeHtml(C.Name || "?")}</strong> ${EscapeHtml(C.Text || "")}</div>`
                                      ).join("")
                                    : `<div class="SceneEmpty">No comments yet.</div>`}
                            </div>
                        `;
                    } catch (Err) {
                        DetailBox.innerHTML = `<div class="SceneEmpty">${EscapeHtml(Err.message || String(Err))}</div>`;
                    }
                }

                RefreshBtn.addEventListener("click", () => LoadList());

                List.addEventListener("click", async (Event) => {
                    const T = Event.target;
                    if (!(T instanceof HTMLElement)) return;
                    const Cog = T.closest(".SceneCogBtn");
                    if (Cog) {
                        Event.preventDefault();
                        OwnerCogMenu(Cog, Cog.dataset.id, Status, async () => {
                            await LoadList();
                            if (ActiveSceneId === Cog.dataset.id) {
                                try { await ShowDetail(ActiveSceneId); }
                                catch (_) {
                                    DetailBox.innerHTML = `<div class="SceneEmpty">Scene removed.</div>`;
                                }
                            }
                        });
                        return;
                    }
                    const Id = T.dataset.id;
                    if (!Id) return;
                    try {
                        if (T.classList.contains("SceneLoad")) {
                            const Doc = await globalThis.MolCloud.LoadScene(Id);
                            globalThis.MolCloud.ApplyScene(Doc);
                            Status.textContent = `Loaded “${Doc.Title || Id}”.`;
                        } else if (T.classList.contains("SceneOpen")) {
                            ShowDetail(Id);
                        }
                    } catch (Err) {
                        Status.textContent = Err.message || String(Err);
                    }
                });

                DetailBox.addEventListener("click", async (Event) => {
                    const T = Event.target;
                    if (!(T instanceof HTMLElement)) return;
                    const Cog = T.closest(".SceneCogBtn");
                    if (Cog) {
                        OwnerCogMenu(Cog, Cog.dataset.id || ActiveSceneId, Status, async () => {
                            await LoadList();
                            if (ActiveSceneId) {
                                try { await ShowDetail(ActiveSceneId); }
                                catch (_) {
                                    DetailBox.innerHTML = `<div class="SceneEmpty">Scene removed.</div>`;
                                }
                            }
                        });
                        return;
                    }
                    const Id = T.dataset.id || ActiveSceneId;
                    if (!Id) return;
                    try {
                        if (T.classList.contains("StarBtn")) {
                            const Stars = Number(T.dataset.star);
                            const Rating = await globalThis.MolCloud.RateScene(Id, Stars);
                            Status.textContent = `Rated ${Stars}★ — avg ${Rating.toFixed(1)}.`;
                            ShowDetail(Id);
                            LoadList();
                        } else if (T.classList.contains("SceneCommentSend")) {
                            const Input = DetailBox.querySelector(".SceneCommentInput");
                            const Text = Input?.value || "";
                            await globalThis.MolCloud.CommentScene(Id, Text);
                            if (Input) Input.value = "";
                            Status.textContent = "Comment posted.";
                            ShowDetail(Id);
                        }
                    } catch (Err) {
                        Status.textContent = Err.message || String(Err);
                    }
                });

                DetailBox.addEventListener("keydown", (Event) => {
                    if (Event.key === "Enter" && Event.target.classList?.contains("SceneCommentInput")) {
                        Event.preventDefault();
                        DetailBox.querySelector(".SceneCommentSend")?.click();
                    }
                });

                LoadList();
            }
        });
    }

    const Entry = {
        Id: "scenes",
        Name: "Scenes",
        Version: "1.1.0",
        Description: "Browse, load, rate, and comment on shared scenes",
        Setup(Api) {
            Api.On("OpenPlugin", ({ Id }) => {
                if (Id === "scenes") OpenWidget(Api);
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