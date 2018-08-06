_MODULES.push({
    description: `
      <ul>
        <li>Adds a button (<i class="fa fa-list"></i>) to the right side of the first page heading of any trade that allows you to check the have/want list against your wishlisted/owned games, along with some filtering options.</li>
      </ul>
    `,
    id: `hwlc`,
    load: hwlc,
    name: `Have/Want List Checker`,
    st: true,
    type: `trades`
  });

  function hwlc() {
    if (!esgst.tradePath) {
      return;
    }
    let obj = {
      button: createHeadingButton({
        context: document.getElementsByClassName(`page_heading`)[0],
        id: `hwlc`,
        icons: [`fa-list`]
      })
    };
    obj.button.addEventListener(`click`, hwlc_openPopup.bind(null, obj));
  }

  function hwlc_openPopup(obj) {
    if (obj.popup) {
      obj.popup.open();
      return;
    }
    obj.popup = new Popup_v2({
      icon: `fa-list`,
      title: `Have/Want List Checker`,
      addScrollable: `left`
    });
    hwlc_addPanel(obj);
    obj.popup.open();
    setTimeout(() => hwlc_getGames(obj), 1000);
  }

  function hwlc_addPanel(obj) {
    obj.panel = obj.popup.getScrollable();
    obj.panel.classList.add(`esgst-hwlc-panel`, `markdown`);
    obj.sections = {};
    hwlc_addSection(obj, `have`, `want`);
    hwlc_addSection(obj, `want`, `have`);
  }

  function hwlc_addSection(obj, key, counterKey) {
    obj[key] = document.querySelector(`.${key}`);
    createElements(obj.panel, `beforeEnd`, [{
      attributes: {
        class: `esgst-hwlc-section`
      },
      type: `div`,
      children: [{
        text: `You ${counterKey}:`,
        type: `h2`
      }, {
        type: `br`
      }, {
        attributes: {
          id: `esgst-hwlc-${key}-textArea`
        },
        type: `textarea`
      }, {
        type: `br`
      }, {
        type: `br`
      }, {
        text: `Matches (you ${counterKey} x they ${key}):`,
        type: `h2`
      }, {
        attributes: {
          id: `esgst-hwlc-${key}-matches`
        },
        type: `ul`,
        children: [{
          attributes: {
            class: `fa fa-circle-o-notch fa-spin`
          },
          type: `i`
        }]
      }, {
        type: `br`
      }, {
        text: `They ${key}:`,
        type: `h2`
      }, {
        attributes: {
          id: `esgst-hwlc-${key}-games`
        },
        type: `ul`,
        children: [{
          attributes: {
            class: `fa fa-circle-o-notch fa-spin`
          },
          type: `i`
        }]
      }, {
        type: `br`
      }, {
        type: `h2`,
        children: [{
          text: `Unable to identify: `,
          type: `node`
        }, {
          attributes: {
            class: `fa fa-question-circle`,
            title: `You can report unidentified games in the ESGST thread so that exceptions can be added for them`
          },
          type: `i`
        }]
      }, {
        attributes: {
          id: `esgst-hwlc-${key}-unidentified`
        },
        type: `ul`,
        children: [{
          attributes: {
            class: `fa fa-circle-o-notch fa-spin`
          },
          type: `i`
        }]
      }]
    }]);
    obj.sections[key] = {
      textArea: document.getElementById(`esgst-hwlc-${key}-textArea`),
      matches: document.getElementById(`esgst-hwlc-${key}-matches`),
      games: document.getElementById(`esgst-hwlc-${key}-games`),
      unidentified: document.getElementById(`esgst-hwlc-${key}-unidentified`)
    };
    obj.sections[key].textArea.addEventListener(`input`, hwlc_filter.bind(null, obj, key, null));
  }

  async function hwlc_getGames(obj) {
    const currentTime = Date.now();
    let cache = JSON.parse(getLocalValue(`hwlcCache`, `{"lastUpdate": 0}`));
    let json = null;
    if (currentTime - cache.lastUpdate > 604800000) {
      try {
        const response = await request({
          method: `GET`,
          url: `https://api.steampowered.com/ISteamApps/GetAppList/v2/`
        });
        cache = {
          data: response.responseText,
          lastUpdate: currentTime
        };
        setLocalValue(`hwlcCache`, JSON.stringify(cache));
      } catch (error) {
        alert(`Could not retrieve list of Steam games. Games will not be identified by name.`);
      }
    }
    json = JSON.parse(cache.data);
    obj.games = {};
    hwlc_addGames(obj, `have`, json);
    hwlc_addGames(obj, `want`, json);
  }

  async function hwlc_addGames(obj, key, json) {
    obj.games[key] = {
      apps: [],
      subs: []
    };
    const unidentified = [];
    const elements = getTextNodesIn(obj[key]);
    for (const element of elements) {
      const parent = element.parentElement;
      const striked = parent.closest(`del`);
      if (striked) {
        // Game assumed to no longer be available.
        continue;
      }
      const name = element.textContent.trim();
      const link = parent.closest(`a`);
      const url = link && link.getAttribute && link.getAttribute(`href`);
      if (url) {
        const match = url.match(/\/(app|sub)\/(\d+)/);
        if (match) {
          obj.games[key][`${match[1]}s`].push({
            id: parseInt(match[2]),
            name,
            parent
          });
          continue;
        }
      }
      if (!hwlc_tidyName(name)) {
        continue;
      }
      if (json) {
        const matches = json.applist.apps.filter(x => hwlc_formatName(x.name) === hwlc_formatName(name));
        if (matches.length) {
          obj.games[key].apps.push({
            id: matches[0].appid,
            name,
            parent
          });
          continue;
        }
      }
      if (unidentified.filter(x => x.name === name).length) {
        // Name has already been found (duplicate).
        continue;
      }
      unidentified.push({name, parent});
    }
    if (key === `want`) {
      try {
        const steamId = document.querySelector(`.author_name`).getAttribute(`href`).match(/\d+/)[0];
        const response = await request({
          method: `GET`,
          url: `http://store.steampowered.com/wishlist/profiles/${steamId}`
        });
        const responseText = response.responseText;
        const wishlistData = responseText.match(/g_rgWishlistData\s=\s(\[(.+?)\]);/);
        if (wishlistData) {
          const appInfo = responseText.match(/g_rgAppInfo\s=\s({(.+?)});/);
          const apps = appInfo ? JSON.parse(appInfo[1]) : null;
          JSON.parse(wishlistData[1]).forEach(item => {
            const id = parseInt(item.appid);
            if (apps && apps[id]) {
              obj.games[key].apps.push({
                id,
                name: apps[id].name,
                wishlisted: true
              });
            } else {
              obj.games[key].apps.push({
                id,
                name: `${id}`,
                wishlisted: true
              });
            }
          });
        }
      } catch (e) { /**/ }
    }
    for (const section in obj.sections[key]) {
      obj.sections[key][section].innerHTML = ``;
    }
    obj.games[key].apps = obj.games[key].apps.map(game => {
      if (game.wishlisted) {
        game.html = {
          type: `li`,
          children: [{
            attributes: {
              class: `fa fa-star`,
              title: `On their wishlist`
            },
            type: `i`
          }, {
            attributes: {
              href: `https://store.steampowered.com/app/${game.id}`
            },
            text: game.name,
            type: `a`
          }]
        };
        return game;
      }
      if (esgst.games.apps[game.id]) {
        if (esgst.games.apps[game.id].owned) {
          game.owned = true;
          game.html = {
            type: `li`,
            children: [{
              attributes: {
                class: `fa fa-folder`,
                title: `On your library`
              },
              type: `i`
            }, {
              attributes: {
                href: `https://store.steampowered.com/app/${game.id}`
              },
              text: game.name,
              type: `a`
            }]
          };
          return game;
        } else if (esgst.games.apps[game.id].wishlisted) {
          game.wishlisted = true;
          game.html = {
            type: `li`,
            children: [{
              attributes: {
                class: `fa fa-star`,
                title: `On your wishlist`
              },
              type: `i`
            }, {
              attributes: {
                href: `https://store.steampowered.com/app/${game.id}`
              },
              text: game.name,
              type: `a`
            }]
          };
          return game;
        }
      }
      game.html = {
        type: `li`,
        children: [{
          attributes: {
            href: `https://store.steampowered.com/app/${game.id}`
          },
          text: game.name,
          type: `a`
        }]
      };
      return game;
    }).sort(hwlc_sortGames);
    obj.games[key].subs = obj.games[key].subs.sort(hwlc_sortGames);
    const appItems = [];
    for (const game of obj.games[key].apps) {
      appItems.push(game.html);
    }
    createElements(obj.sections[key].games, `beforeEnd`, appItems);
    const subItems = [];
    for (const game of obj.games[key].subs) {
      subItems.push({
        type: `li`,
        children: [{
          attributes: {
            class: `fa fa-suitcase`,
            title: `This is a package (packages are not checked for wishlisted/owned status)`
          },
          type: `i`
        }, {
          attributes: {
            href: `https://store.steampowered.com/sub/${game.id}`
          },
          text: game.name || game.id,
          type: `a`
        }]
      });
    }
    createElements(obj.sections[key].games, `beforeEnd`, subItems);
    const unidentifiedItems = [];
    for (const game of unidentified) {
      unidentifiedItems.push({
        text: game.name,
        type: `li`
      });
    }
    createElements(obj.sections[key].unidentified, `beforeEnd`, unidentifiedItems);
    for (const section in obj.sections[key]) {
      if (section === `textArea` || obj.sections[key][section].innerHTML) {
        continue;
      }
      createElements(obj.sections[key][section], `inner`, [{
        text: `None.`,
        type: `node`
      }]);
    }
    const query = getLocalValue(`hwlc_${key}`);
    if (query) {
      obj.sections[key].textArea.value = query;
      hwlc_filter(obj, key);
    }
  }

  function hwlc_filter(obj, key) {
    obj.sections[key].matches.innerHTML = ``;
    const query = obj.sections[key].textArea.value;
    setLocalValue(`hwlc_${key}`, query);
    let found = [];
    const values = query.split(/\n/);
    for (let value of values) {
      value = value.trim().toLowerCase();
      if (!value) {
        continue;
      }
      obj.games[key].apps.filter(game => game.name.toLowerCase().match(value)).forEach(game => {
        if (found.filter(x => x.name === game.name).length) {
          return;
        }
        found.push({
          id: game.id,
          name: game.name,
          type: `app`
        });
      });
      obj.games[key].subs.filter(game => game.name.toLowerCase().match(value)).forEach(game => {
        if (found.filter(x => x.name === game.name).length) {
          return;
        }
        found.push({
          id: game.id,
          name: game.name,
          type: `sub`
        });
      });
    }
    found = found.sort(hwlc_sortGames);
    const items = [];
    for (const game of found) {
      items.push({
        type: `li`,
        children: [{
          attributes: {
            href: `https://store.steampowered.com/${game.type}/${game.id}`
          },
          text: game.name || game.id,
          type: `a`
        }]
      });
    }
    createElements(obj.sections[key].matches, `beforeEnd`, items);
    if (!obj.sections[key].matches.innerHTML) {
      createElements(obj.sections[key].matches, `inner`, [{
        text: `None.`,
        type: `node`
      }]);
    }
  }

  function hwlc_tidyName(name) {
    return name
      .replace(/[^\w]/g, ``).toLowerCase()
      .replace(/steamkeys/, ``);
  }

  function hwlc_formatName(name) {
    return name
      .replace(/[^\w]/g, ``).toLowerCase()
      .replace(/windowsedition/, ``);
  }

  function hwlc_sortGames(a, b) {
    if (a.wishlisted && !b.wishlisted) {
      return -1;
    }
    if (!a.wishlisted && b.wishlisted) {
      return 1;
    }
    if (a.owned && !b.owned) {
      return 1;
    }
    if (!a.owned && b.owned) {
      return -1;
    }
    return a.name.localeCompare(b.name, {
      sensitivity: `base`
    });
  }
