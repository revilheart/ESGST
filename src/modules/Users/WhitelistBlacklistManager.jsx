import { DOM } from '../../class/DOM';
import { Module } from '../../class/Module';
import { Popup } from '../../class/Popup';
import { Session } from '../../class/Session';
import { Settings } from '../../class/Settings';
import { Shared } from '../../class/Shared';
import { ToggleSwitch } from '../../class/ToggleSwitch';
import { Button } from '../../components/Button';
import { common } from '../Common';

const createConfirmation = common.createConfirmation.bind(common),
	createElements = common.createElements.bind(common),
	createFadeMessage = common.createFadeMessage.bind(common),
	createHeadingButton = common.createHeadingButton.bind(common),
	downloadFile = common.downloadFile.bind(common),
	formatTags = common.formatTags.bind(common),
	request = common.request.bind(common),
	setSetting = common.setSetting.bind(common);
class UsersWhitelistBlacklistManager extends Module {
	constructor() {
		super();
		this.info = {
			description: () => (
				<ul>
					<li>
						Adds a button (<i className="fa fa-arrow-up"></i> <i className="fa fa-arrow-down"></i>{' '}
						<i className="fa fa-trash"></i>) to the main page heading of your{' '}
						<a href="https://www.steamgifts.com/account/manage/whitelist">whitelist</a>/
						<a href="https://www.steamgifts.com/account/manage/blacklist">blacklist</a> pages that
						allows you to import/export/clear your whitelist/blacklist.
					</li>
				</ul>
			),
			id: 'wbm',
			name: 'Whitelist/Blacklist Manager',
			sg: true,
			type: 'users',
		};
	}

	init() {
		if (!Shared.esgst.whitelistPath && !Shared.esgst.blacklistPath) return;
		let wbm = {};
		if (Shared.esgst.whitelistPath) {
			wbm.key = 'whitelist';
			wbm.name = 'Whitelist';
		} else {
			wbm.key = 'blacklist';
			wbm.name = 'Blacklist';
		}
		wbm.button = createHeadingButton({
			id: 'wbm',
			icons: ['fa-arrow-up', 'fa-arrow-down', 'fa-trash'],
			title: `Manage ${wbm.key}`,
		});
		wbm.button.addEventListener('click', this.wbm_openPopup.bind(this, wbm));
	}

	wbm_openPopup(wbm) {
		if (!wbm.popup) {
			wbm.popup = new Popup({ addScrollable: true, icon: 'fa-gear', title: `Manage ${wbm.name}:` });
			const useCacheSwitch = new ToggleSwitch(
				wbm.popup.description,
				'wbm_useCache',
				false,
				'Use cache.',
				false,
				false,
				`Uses the cache created the last time you synced your whitelist/blacklist. This speeds up the process, but could lead to incomplete results if your cache isn't up-to-date.`,
				Settings.get('wbm_useCache')
			);
			const exportSteamIdsSwitch = new ToggleSwitch(
				wbm.popup.description,
				'wbm_exportSteamIds',
				false,
				'Export Steam IDs.',
				false,
				false,
				`When exporting the whitelist/blacklist, the Steam IDs of the users will be exported instead of their SteamGifts IDs. This is useful, for example, for blocking / unblocking the users on Steam with the Steam IDs.`,
				Settings.get('wbm_exportSteamIds')
			);
			useCacheSwitch.dependencies.push(exportSteamIdsSwitch.container);
			if (!Settings.get('wbm_useCache')) {
				exportSteamIdsSwitch.container.classList.add('esgst-hidden');
			}
			new ToggleSwitch(
				wbm.popup.description,
				'wbm_clearTags',
				false,
				(
					<fragment>
						Only clear users who are tagged with these specific tags (separate with comma):{' '}
						<input
							className="esgst-switch-input esgst-switch-input-large"
							type="text"
							value={Settings.get('wbm_tags').join(`, `)}
						/>
					</fragment>
				),
				false,
				false,
				'Uses the User Tags database to remove only users with the specified tags.',
				Settings.get('wbm_clearTags')
			).name.firstElementChild.addEventListener('change', (event) => {
				const element = event.currentTarget;
				let tags = element.value.replace(/(,\s*)+/g, formatTags).split(`, `);
				setSetting('wbm_tags', tags);
			});
			wbm.input = createElements(wbm.popup.description, 'beforeend', [
				{
					attributes: {
						type: 'file',
					},
					type: 'input',
				},
			]);
			wbm.message = createElements(wbm.popup.description, 'beforeend', [
				{
					attributes: {
						class: 'esgst-description',
					},
					type: 'div',
				},
			]);
			wbm.warning = createElements(wbm.popup.description, 'beforeend', [
				{
					attributes: {
						class: 'esgst-description esgst-warning',
					},
					type: 'div',
				},
			]);
			Button.create([
				{
					color: 'green',
					icons: ['fa-arrow-up'],
					name: 'Import',
					onClick: () => {
						return new Promise((resolve) =>
							this.wbm_start(wbm, this.wbm_importList.bind(this, wbm), resolve)
						);
					},
				},
				{
					template: 'error',
					name: 'Cancel',
					switchTo: { onReturn: 0 },
					onClick: this.wbm_cancel.bind(this, wbm),
				},
			]).insert(wbm.popup.description, 'beforeend');
			Button.create([
				{
					color: 'green',
					icons: ['fa-arrow-down'],
					name: 'Export',
					onClick: () => {
						return new Promise((resolve) =>
							this.wbm_start(wbm, this.wbm_exportList.bind(this, wbm, [], 1), resolve)
						);
					},
				},
				{
					template: 'error',
					name: 'Cancel',
					switchTo: { onReturn: 0 },
					onClick: this.wbm_cancel.bind(this, wbm),
				},
			]).insert(wbm.popup.description, 'beforeend');
			Button.create([
				{
					color: 'green',
					icons: ['fa-trash'],
					name: 'Clear',
					onClick: () => {
						return new Promise((resolve) =>
							this.wbm_start(wbm, this.wbm_clearList.bind(this, wbm, [], 1), resolve)
						);
					},
				},
				{
					template: 'error',
					name: 'Cancel',
					switchTo: { onReturn: 0 },
					onClick: this.wbm_cancel.bind(this, wbm),
				},
			]).insert(wbm.popup.description, 'beforeend');
			wbm.results = createElements(wbm.popup.scrollable, 'beforeend', [
				{
					type: 'div',
				},
			]);
		}
		wbm.popup.open();
	}

	wbm_start(wbm, callback, mainCallback) {
		createConfirmation(
			'Are you sure you want to do this?',
			() => {
				wbm.isCanceled = false;
				wbm.button.classList.add('esgst-busy');
				wbm.usernames = [];
				wbm.results.innerHTML = '';
				callback(this.wbm_complete.bind(this, wbm, mainCallback));
			},
			mainCallback
		);
	}

	wbm_complete(wbm, callback) {
		wbm.button.classList.remove('esgst-busy');
		callback();
	}

	wbm_cancel(wbm) {
		wbm.isCanceled = true;
		wbm.button.classList.remove('esgst-busy');
	}

	wbm_importList(wbm, callback) {
		let file = wbm.input.files[0];
		if (file) {
			let reader = new FileReader();
			reader.onload = () => {
				try {
					// @ts-ignore
					let list = JSON.parse(reader.result);
					// noinspection JSIgnoredPromiseFromCall
					this.wbm_insertUsers(wbm, list, 0, list.length, callback);
				} catch (error) {
					createFadeMessage(wbm.warning, 'Cannot parse file!');
					callback();
				}
			};
			reader.readAsText(file);
		} else {
			createFadeMessage(wbm.warning, 'No file was loaded!');
			callback();
		}
	}

	async wbm_insertUsers(wbm, list, i, n, callback) {
		if (wbm.isCanceled) return;
		createElements(wbm.message, 'atinner', [
			{
				attributes: {
					class: 'fa fa-circle-o-notch fa-spin',
				},
				type: 'i',
			},
			{
				text: `Importing list (${i} of ${n})...`,
				type: 'span',
			},
		]);
		if (i < n) {
			await request({
				data: `xsrf_token=${Session.xsrfToken}&do=${wbm.key}&action=insert&child_user_id=${list[i]}`,
				method: 'POST',
				url: '/ajax.php',
			});
			window.setTimeout(() => this.wbm_insertUsers(wbm, list, ++i, n, callback), 0);
		} else {
			createFadeMessage(wbm.message, 'List imported with success!');
			callback();
		}
	}

	async wbm_exportList(wbm, list, nextPage, callback) {
		if (wbm.isCanceled) return;
		if (Settings.get('wbm_useCache')) {
			const exportSteamIds = Settings.get('wbm_exportSteamIds');
			for (const steamId in Shared.esgst.users.users) {
				if (Shared.esgst.users.users.hasOwnProperty(steamId)) {
					if (Shared.esgst.users.users[steamId][`${wbm.key}ed`]) {
						list.push(exportSteamIds ? steamId : Shared.esgst.users.users[steamId].id);
					}
				}
			}
			downloadFile(JSON.stringify(list), `esgst_${wbm.key}_${new Date().toISOString()}.json`);
			createFadeMessage(wbm.message, 'List exported with success!');
			callback();
		} else {
			createElements(wbm.message, 'atinner', [
				{
					attributes: {
						class: 'fa fa-circle-o-notch fa-spin',
					},
					type: 'i',
				},
				{
					text: `Retrieving list (page ${nextPage})...`,
					type: 'span',
				},
			]);
			let elements, i, n, pagination, responseHtml;
			responseHtml = DOM.parse(
				(
					await request({
						method: 'GET',
						url: `https://www.steamgifts.com/account/manage/${wbm.key}/search?page=${nextPage}`,
					})
				).responseText
			);
			elements = responseHtml.querySelectorAll(`[name="child_user_id"]`);
			for (i = 0, n = elements.length; i < n; ++i) {
				list.push(elements[i].value);
			}
			pagination = responseHtml.getElementsByClassName('pagination__navigation')[0];
			if (pagination && !pagination.lastElementChild.classList.contains('is-selected')) {
				window.setTimeout(() => this.wbm_exportList(wbm, list, ++nextPage, callback), 0);
			} else {
				downloadFile(JSON.stringify(list), `esgst_${wbm.key}_${new Date().toISOString()}.json`);
				createFadeMessage(wbm.message, 'List exported with success!');
				callback();
			}
		}
	}

	async wbm_clearList(wbm, list, nextPage, callback) {
		if (wbm.isCanceled) return;
		if (Settings.get('wbm_useCache')) {
			let steamId;
			for (steamId in Shared.esgst.users.users) {
				if (Shared.esgst.users.users.hasOwnProperty(steamId)) {
					let user = Shared.esgst.users.users[steamId];
					if (user[`${wbm.key}ed`]) {
						if (Settings.get('wbm_clearTags')) {
							if (user.tags) {
								let i;
								for (
									i = user.tags.length - 1;
									i > -1 && Settings.get('wbm_tags').indexOf(user.tags[i]) < 0;
									--i
								) {}
								if (i > -1) {
									list.push(user.id);
									wbm.usernames.push(user.username);
								}
							}
						} else {
							list.push(user.id);
						}
					}
				}
			}
			// noinspection JSIgnoredPromiseFromCall
			this.wbm_deleteUsers(wbm, list, 0, list.length, callback);
		} else {
			createElements(wbm.message, 'atinner', [
				{
					attributes: {
						class: 'fa fa-circle-o-notch fa-spin',
					},
					type: 'i',
				},
				{
					text: `Retrieving list (page ${nextPage})...`,
					type: 'span',
				},
			]);
			let element, elements, i, n, pagination, responseHtml;
			responseHtml = DOM.parse(
				(
					await request({
						method: 'GET',
						url: `https://www.steamgifts.com/account/manage/${wbm.key}/search?page=${nextPage}`,
					})
				).responseText
			);
			elements = responseHtml.querySelectorAll(`[name="child_user_id"]`);
			for (i = 0, n = elements.length; i < n; ++i) {
				element = elements[i];
				if (Settings.get('wbm_clearTags')) {
					let steamId, username;
					username = element
						.closest('.table__row-inner-wrap')
						.getElementsByClassName('table__column__heading')[0].textContent;
					steamId = Shared.esgst.users.steamIds[username];
					if (steamId) {
						let user = Shared.esgst.users.users[steamId];
						if (user.tags) {
							let j;
							for (
								j = user.tags.length - 1;
								j > -1 && Settings.get('wbm_tags').indexOf(user.tags[j]) < 0;
								--j
							) {}
							if (j > -1) {
								list.push(element.value);
								wbm.usernames.push(username);
							}
						}
					}
				} else {
					list.push(element.value);
				}
			}
			pagination = responseHtml.getElementsByClassName('pagination__navigation')[0];
			if (pagination && !pagination.lastElementChild.classList.contains('is-selected')) {
				window.setTimeout(() => this.wbm_clearList(wbm, list, ++nextPage, callback), 0);
			} else {
				// noinspection JSIgnoredPromiseFromCall
				this.wbm_deleteUsers(wbm, list, 0, list.length, callback);
			}
		}
	}

	async wbm_deleteUsers(wbm, list, i, n, callback) {
		if (wbm.isCanceled) return;
		createElements(wbm.message, 'atinner', [
			{
				attributes: {
					class: 'fa fa-circle-o-notch fa-spin',
				},
				type: 'i',
			},
			{
				text: `Clearing list (${i} of ${n})...`,
				type: 'span',
			},
		]);
		if (i < n) {
			await request({
				data: `xsrf_token=${Session.xsrfToken}&do=${wbm.key}&action=delete&child_user_id=${list[i]}`,
				method: 'POST',
				url: '/ajax.php',
			});
			window.setTimeout(() => this.wbm_deleteUsers(wbm, list, ++i, n, callback), 0);
		} else {
			createFadeMessage(wbm.message, 'List cleared with success!');
			createElements(wbm.results, 'atinner', [
				{
					attributes: {
						class: 'esgst-bold',
					},
					text: `Users cleared (${wbm.usernames.length}):`,
					type: 'span',
				},
				{
					attributes: {
						class: 'esgst-popup-actions',
					},
					type: 'span',
				},
			]);
			wbm.usernames.forEach((username) => {
				createElements(wbm.results.lastElementChild, 'beforeend', [
					{
						attributes: {
							href: `/user/${username}`,
						},
						text: username,
						type: 'a',
					},
				]);
			});
			callback();
		}
	}
}

const usersWhitelistBlacklistManager = new UsersWhitelistBlacklistManager();

export { usersWhitelistBlacklistManager };
