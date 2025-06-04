import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface ObsidunlimeSettings {
	hideUnlinkedMentions: boolean;
	hideUnlinkedMentionsOutgoing: boolean;
	verboseLogging: boolean;
}

const DEFAULT_SETTINGS: ObsidunlimeSettings = {
	hideUnlinkedMentions: false,
	hideUnlinkedMentionsOutgoing: false,
	verboseLogging: false
}

export default class ObsidunlimePlugin extends Plugin {
	settings: ObsidunlimeSettings;
	styleEl: HTMLStyleElement;
	observer: MutationObserver;

	private log(...args: any[]): void {
		if (this.settings.verboseLogging) {
			console.log('[Obsidunlime]', ...args);
		}
	}

	async onload() {
		await this.loadSettings();

		console.log('Loading Obsidunlime plugin');

		this.addSettingTab(new ObsidunlimeSettingTab(this.app, this));

		// Create style element for hiding unlinked mentions
		this.styleEl = document.createElement('style');
		document.head.appendChild(this.styleEl);
		
		// Apply initial state
		this.updateUnlinkedMentionsVisibility();

		// Listen for workspace layout changes
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.updateUnlinkedMentionsVisibility();
			})
		);

		// Use MutationObserver to watch for DOM changes
		let debounceTimer: NodeJS.Timeout;
		this.observer = new MutationObserver((mutations) => {
			// Check if the mutations are relevant to backlinks/outgoing links panels
			const relevantMutation = mutations.some(mutation => {
				const target = mutation.target as HTMLElement;
				return target.closest('.workspace-leaf-content[data-type="backlink"]') ||
				       target.closest('.workspace-leaf-content[data-type="outgoing-link"]') ||
				       mutation.addedNodes.length > 0;
			});
			
			if (relevantMutation && (this.settings.hideUnlinkedMentions || this.settings.hideUnlinkedMentionsOutgoing)) {
				// Debounce to avoid excessive processing
				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					const panelTypes: string[] = [];
					if (this.settings.hideUnlinkedMentions) {
						panelTypes.push('backlink');
					}
					if (this.settings.hideUnlinkedMentionsOutgoing) {
						panelTypes.push('outgoing-link');
					}
					this.hideUnlinkedMentionsByText(panelTypes);
				}, 100);
			}
		});

		// Start observing when layout is ready
		this.app.workspace.onLayoutReady(() => {
			// Observe the entire workspace for changes
			const workspaceEl = document.querySelector('.workspace');
			if (workspaceEl) {
				this.observer.observe(workspaceEl, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ['class', 'style']
				});
			}
		});
	}

	onunload() {
		console.log('Unloading Obsidunlime plugin');
		
		// Clean up
		if (this.styleEl) {
			this.styleEl.remove();
		}
		if (this.observer) {
			this.observer.disconnect();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateUnlinkedMentionsVisibility();
	}

	updateUnlinkedMentionsVisibility() {
		this.log('updateUnlinkedMentionsVisibility called, hideUnlinkedMentions:', this.settings.hideUnlinkedMentions, 'hideUnlinkedMentionsOutgoing:', this.settings.hideUnlinkedMentionsOutgoing);
		
		// Clear any existing CSS rules
		this.styleEl.textContent = '';
		
		// Generate panel types to process
		const panelTypes: string[] = [];
		if (this.settings.hideUnlinkedMentions) {
			panelTypes.push('backlink');
		}
		if (this.settings.hideUnlinkedMentionsOutgoing) {
			panelTypes.push('outgoing-link');
		}
		
		if (panelTypes.length > 0) {
			// Use JavaScript-based approach for more precise control
			setTimeout(() => {
				this.hideUnlinkedMentionsByText(panelTypes);
			}, 200);
		} else {
			// Restore visibility of elements hidden by JavaScript
			this.showUnlinkedMentions();
		}
	}

	hideUnlinkedMentionsByText(panelTypes: string[]) {
		this.log('hideUnlinkedMentionsByText called for panel types:', panelTypes);
		
		// Search in each panel type
		panelTypes.forEach(panelType => {
			const panelContainers = document.querySelectorAll(`.workspace-leaf-content[data-type="${panelType}"]`);
			this.log(`Found ${panelContainers.length} panel containers for type: ${panelType}`);
			
			panelContainers.forEach((container, index) => {
				this.log(`Processing container ${index + 1} for ${panelType}:`, container);
				
				// Log panel-specific information
				if (panelType === 'outgoing-link') {
					this.log(`Processing outgoing links panel with improved logic`);
				}
				
				// Look specifically for tree-item-self elements that contain "Unlinked mentions"
				const treeItemSelfs = container.querySelectorAll('.tree-item-self');
				this.log(`Found ${treeItemSelfs.length} tree-item-self elements`);
				
				treeItemSelfs.forEach((treeItemSelf, selfIndex) => {
					const textContent = treeItemSelf.textContent || '';
					this.log(`Tree-item-self ${selfIndex + 1} text: "${textContent.trim()}"`);
					
					// Check if this is specifically the "Unlinked mentions" header
					if (textContent.trim() === 'Unlinked mentions') {
						this.log(`Found exact unlinked mentions header in ${panelType}:`, treeItemSelf);
						
						// Find the parent tree-item to hide the entire section
						const parentTreeItem = treeItemSelf.closest('.tree-item') as HTMLElement;
						if (parentTreeItem && !parentTreeItem.dataset.obsidunlimeHidden) {
							this.log(`Hiding parent tree-item:`, parentTreeItem);
							parentTreeItem.dataset.obsidunlimeHidden = 'true';
							parentTreeItem.style.display = 'none';
							
							// Also hide any adjacent tree-item-children that belong to this section
							let nextSibling = parentTreeItem.nextElementSibling;
							while (nextSibling && nextSibling.classList.contains('tree-item-children')) {
								const htmlSibling = nextSibling as HTMLElement;
								this.log(`Hiding adjacent tree-item-children:`, htmlSibling);
								htmlSibling.dataset.obsidunlimeHidden = 'true';
								htmlSibling.style.display = 'none';
								nextSibling = nextSibling.nextElementSibling;
							}
						}
					}
				});
				
				// Alternative approach: Look for div.tree-item-inner containing exactly "Unlinked mentions"
				const treeItemInners = container.querySelectorAll('.tree-item-inner');
				this.log(`Found ${treeItemInners.length} tree-item-inner elements`);
				
				treeItemInners.forEach((inner, innerIndex) => {
					const text = inner.textContent || '';
					this.log(`Tree-item-inner ${innerIndex + 1} text: "${text.trim()}"`);
					
					if (text.trim() === 'Unlinked mentions') {
						this.log(`Found unlinked mentions in tree-item-inner:`, inner);
						
						// Strategy: Find the broader container that includes both header and content
						let containerToHide: HTMLElement | null = null;
						
						// Try to find various parent containers, going higher up the DOM
						const parentTreeItem = inner.closest('.tree-item') as HTMLElement;
						const parentTreeItemSelf = inner.closest('.tree-item-self') as HTMLElement;
						const parentCollapsible = inner.closest('.is-clickable') as HTMLElement;
						const parentWithCollapse = inner.closest('[aria-label*="collapse"]') as HTMLElement;
						
						// NEW: Try to find broader containers that might contain the whole section
						const searchResultContainer = inner.closest('.search-result-container') as HTMLElement;
						const viewContent = inner.closest('.view-content') as HTMLElement;
						const navFolder = inner.closest('.nav-folder') as HTMLElement;
						
						this.log(`Parent tree-item found:`, parentTreeItem);
						this.log(`Parent tree-item-self found:`, parentTreeItemSelf);
						this.log(`Parent collapsible found:`, parentCollapsible);
						this.log(`Parent with collapse found:`, parentWithCollapse);
						this.log(`Search result container found:`, searchResultContainer);
						this.log(`View content found:`, viewContent);
						this.log(`Nav folder found:`, navFolder);
						
						// Choose the best container to hide - prefer broader containers
						containerToHide = searchResultContainer || navFolder || parentTreeItem || parentTreeItemSelf || parentCollapsible || parentWithCollapse;
						
						if (containerToHide && !containerToHide.dataset.obsidunlimeHidden) {
							this.log(`Hiding container:`, containerToHide);
							containerToHide.dataset.obsidunlimeHidden = 'true';
							containerToHide.style.display = 'none';
							
							// Use the improved approach to hide content that follows this header
							this.hideUnlinkedMentionsContentAfterHeader(container, containerToHide);
						} else if (!containerToHide) {
							this.log(`No suitable parent container found, trying direct parent approach`);
							// Fallback: hide the direct parent of the inner element
							let parent = inner.parentElement;
							while (parent && parent !== container && !parent.dataset.obsidunlimeHidden) {
								this.log(`Checking parent:`, parent, `Classes:`, parent.className);
								if (parent.classList.contains('tree-item-self') || 
								    parent.classList.contains('is-clickable') ||
								    parent.hasAttribute('aria-label')) {
									this.log(`Hiding direct parent:`, parent);
									parent.dataset.obsidunlimeHidden = 'true';
									parent.style.display = 'none';
									break;
								}
								parent = parent.parentElement;
							}
						} else {
							this.log(`Container already marked as hidden`);
						}
						
						// IMPROVED APPROACH: Only hide content that's directly following the unlinked mentions header
						// and is definitely part of that section (avoiding false positives with linked mentions)
						this.log(`Looking for unlinked mention content immediately following the header...`);
						this.hideUnlinkedMentionsContentAfterHeader(container, containerToHide);
					}
				});
			});
		});
	}
	
	private hideUnlinkedMentionsContentAfterHeader(container: Element, unlinkedMentionsHeader: HTMLElement | null) {
		if (!unlinkedMentionsHeader) return;
		
		// Determine panel type for better logging and handling
		const panelType = container.closest('[data-type]')?.getAttribute('data-type') || 'unknown';
		this.log(`Hiding unlinked content for ${panelType} panel`);
		
		// Strategy: Find elements that immediately follow the unlinked mentions header
		// and are structurally part of the unlinked mentions section
		let currentElement = unlinkedMentionsHeader.nextElementSibling;
		
		while (currentElement) {
			const htmlElement = currentElement as HTMLElement;
			
			// Stop if we encounter another section header (this indicates we've left the unlinked mentions section)
			if (this.isNewSectionHeader(currentElement)) {
				this.log(`Found next section header, stopping traversal:`, currentElement);
				break;
			}
			
			// Only hide elements that are definitely part of unlinked mentions content
			if (this.isDefinitelyUnlinkedContent(currentElement, panelType)) {
				this.log(`Hiding unlinked content element in ${panelType}:`, currentElement);
				this.log(`  - Classes: ${currentElement.className}`);
				this.log(`  - Text: "${currentElement.textContent?.trim().substring(0, 100)}..."`);
				
				htmlElement.dataset.obsidunlimeHidden = 'true';
				htmlElement.style.display = 'none';
			}
			
			currentElement = currentElement.nextElementSibling;
		}
	}
	
	private isNewSectionHeader(element: Element): boolean {
		// Check if this element represents a new section header
		const text = element.textContent?.trim() || '';
		
		// Section headers in both backlinks and outgoing links panels
		const sectionHeaders = [
			'Linked mentions', 'Unlinked mentions',  // Backlinks panel
			'Links', 'Unlinked mentions'  // Outgoing links panel (may use different naming)
		];
		
		// Check if this is a tree-item-self with section header text
		if (element.classList.contains('tree-item-self')) {
			const innerElement = element.querySelector('.tree-item-inner');
			if (innerElement) {
				const innerText = innerElement.textContent?.trim() || '';
				// If it matches a section header, it's a new section
				if (sectionHeaders.includes(innerText)) {
					return true;
				}
				// If it's NOT a section header but has tree-item-inner, it's likely a document name (linked mention)
				if (!sectionHeaders.includes(innerText) && innerText.length > 0) {
					return true;
				}
			}
		}
		
		return false;
	}
	
	private isDefinitelyUnlinkedContent(element: Element, panelType?: string): boolean {
		// Only return true for elements that are definitely unlinked mentions content
		// This is more conservative to avoid hiding linked mentions
		
		// Direct children containers of unlinked mentions (common to both panels)
		if (element.classList.contains('tree-item-children') ||
			element.classList.contains('search-result-container')) {
			return true;
		}
		
		// Elements with specific patterns that indicate "no mentions found" messages
		const text = element.textContent?.trim() || '';
		if (text.includes('No unlinked mentions found') || 
			text.includes('No matches found')) {
			return true;
		}
		
		// Panel-specific handling
		if (panelType === 'outgoing-link') {
			// Outgoing links panel might have different empty state messages
			if (text.includes('No unlinked files found') ||
				text.includes('No unresolved links')) {
				return true;
			}
		} else if (panelType === 'backlink') {
			// Backlink-specific patterns (if any)
			// Currently using the general patterns above
		}
		
		return false;
	}

	showUnlinkedMentions() {
		this.log('showUnlinkedMentions called');
		
		// Only restore elements that we specifically hid (marked with data-obsidunlime-hidden)
		// This will find elements in both backlink and outgoing-link panels
		const hiddenElements = document.querySelectorAll('[data-obsidunlime-hidden="true"]');
		
		hiddenElements.forEach(element => {
			const htmlElement = element as HTMLElement;
			this.log('Restoring element:', htmlElement);
			
			// Remove our marker
			delete htmlElement.dataset.obsidunlimeHidden;
			
			// Remove only the styles we set
			htmlElement.style.removeProperty('display');
			htmlElement.style.removeProperty('visibility');
			htmlElement.style.removeProperty('height');
			htmlElement.style.removeProperty('overflow');
		});
	}
}

class ObsidunlimeSettingTab extends PluginSettingTab {
	plugin: ObsidunlimePlugin;

	constructor(app: App, plugin: ObsidunlimePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Obsidunlime Settings'});

		new Setting(containerEl)
			.setName('Unlinked mentions (backlinks)')
			.setDesc('Hide the "Unlinked mentions" section in the Backlinks panel')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideUnlinkedMentions)
				.onChange(async (value) => {
					this.plugin.settings.hideUnlinkedMentions = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Unlinked mentions (outgoing links)')
			.setDesc('Hide the "Unlinked mentions" section in the Outgoing links panel')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideUnlinkedMentionsOutgoing)
				.onChange(async (value) => {
					this.plugin.settings.hideUnlinkedMentionsOutgoing = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Verbose logging')
			.setDesc('Enable detailed console logging for debugging purposes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.verboseLogging)
				.onChange(async (value) => {
					this.plugin.settings.verboseLogging = value;
					await this.plugin.saveSettings();
				}));
	}
}