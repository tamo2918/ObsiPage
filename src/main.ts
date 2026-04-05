import { Plugin, WorkspaceLeaf } from "obsidian";
import { PagesView, VIEW_TYPE_PAGES } from "./pages-view";

export default class PagesViewerPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(VIEW_TYPE_PAGES, (leaf) => new PagesView(leaf));
		this.registerExtensions(["pages"], VIEW_TYPE_PAGES);

		// Handle navigation away from .pages files.
		// When a non-.pages file is opened in a leaf that currently holds a PagesView,
		// Obsidian may not automatically replace the custom view. We listen for
		// file-open events and manually switch the leaf's view type when needed.
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (!file) return;
				if (file.extension === "pages") return;

				const leaf = this.app.workspace.getActiveViewOfType(PagesView)?.leaf;
				if (!leaf) return;

				// The active leaf still has a PagesView but a non-.pages file was opened.
				// Detach the PagesView and let Obsidian open the file with the correct view.
				this.replaceLeafView(leaf, file);
			})
		);
	}

	private async replaceLeafView(leaf: WorkspaceLeaf, file: any): Promise<void> {
		// Detach the PagesView and set the leaf to the default view for this file type
		await leaf.openFile(file, { state: { mode: "source" } });
	}

	async onunload(): Promise<void> {
		// Obsidian handles view cleanup automatically
	}
}
