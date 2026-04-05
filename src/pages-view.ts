import { FileView, TFile, WorkspaceLeaf, Notice } from "obsidian";
import JSZip from "jszip";

export const VIEW_TYPE_PAGES = "pages-view";

/**
 * Known locations for preview images inside .pages ZIP archives.
 * Ordered by preference: higher quality / more common paths first.
 */
const PREVIEW_PATHS = [
	// Modern iWork format (2013+)
	"preview.jpg",
	"preview.jpeg",
	"preview.png",
	"preview-web.jpg",
	"preview-micro.jpg",
	// Legacy iWork format ('08/'09)
	"QuickLook/Preview.pdf",
	"QuickLook/Thumbnail.jpg",
	"QuickLook/Thumbnail.jpeg",
	"QuickLook/Thumbnail.png",
];

/** MIME types for rendering extracted files */
const MIME_MAP: Record<string, string> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	pdf: "application/pdf",
};

function getMime(filename: string): string {
	const ext = filename.split(".").pop()?.toLowerCase() ?? "";
	return MIME_MAP[ext] ?? "application/octet-stream";
}

export class PagesView extends FileView {
	private objectUrls: string[] = [];

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.navigation = true;
	}

	getViewType(): string {
		return VIEW_TYPE_PAGES;
	}

	getDisplayText(): string {
		return this.file?.basename ?? "Pages Document";
	}

	getIcon(): string {
		return "file-text";
	}

	async onLoadFile(file: TFile): Promise<void> {
		this.cleanup();

		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("pages-viewer-container");

		// Loading indicator
		const loadingEl = container.createDiv({ cls: "pages-viewer-loading" });
		loadingEl.createSpan({ text: "Loading .pages file..." });

		try {
			const data = await this.app.vault.readBinary(file);
			const zip = await JSZip.loadAsync(data);

			// Try to find a preview file
			const result = await this.extractPreview(zip);

			container.empty();

			if (result) {
				this.renderPreview(container, result, file);
			} else {
				// No preview found — try to list embedded images from Data/ folder
				const images = await this.extractEmbeddedImages(zip);
				if (images.length > 0) {
					this.renderEmbeddedImages(container, images, file);
				} else {
					this.renderNoPreview(container, file, zip);
				}
			}
		} catch (err) {
			container.empty();
			this.renderError(container, file, err);
		}
	}

	async onUnloadFile(file: TFile): Promise<void> {
		this.cleanup();
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
	}

	canAcceptExtension(extension: string): boolean {
		return extension === "pages";
	}

	private cleanup(): void {
		for (const url of this.objectUrls) {
			URL.revokeObjectURL(url);
		}
		this.objectUrls = [];
	}

	/**
	 * Attempt to extract a preview image/PDF from the .pages ZIP.
	 */
	private async extractPreview(
		zip: JSZip
	): Promise<{ data: ArrayBuffer; filename: string } | null> {
		for (const path of PREVIEW_PATHS) {
			const entry = zip.file(path);
			if (entry) {
				const data = await entry.async("arraybuffer");
				return { data, filename: path };
			}
		}

		// Fallback: search for any file matching preview patterns
		const allFiles = Object.keys(zip.files);
		for (const name of allFiles) {
			const lower = name.toLowerCase();
			if (
				(lower.includes("preview") || lower.includes("thumbnail")) &&
				(lower.endsWith(".jpg") ||
					lower.endsWith(".jpeg") ||
					lower.endsWith(".png") ||
					lower.endsWith(".pdf"))
			) {
				const entry = zip.file(name);
				if (entry) {
					const data = await entry.async("arraybuffer");
					return { data, filename: name };
				}
			}
		}

		return null;
	}

	/**
	 * Extract embedded images from the Data/ folder as a fallback.
	 */
	private async extractEmbeddedImages(
		zip: JSZip
	): Promise<{ data: ArrayBuffer; filename: string }[]> {
		const images: { data: ArrayBuffer; filename: string }[] = [];
		const allFiles = Object.keys(zip.files);

		for (const name of allFiles) {
			const lower = name.toLowerCase();
			if (
				lower.startsWith("data/") &&
				(lower.endsWith(".jpg") ||
					lower.endsWith(".jpeg") ||
					lower.endsWith(".png") ||
					lower.endsWith(".gif") ||
					lower.endsWith(".tiff"))
			) {
				const entry = zip.file(name);
				if (entry) {
					const data = await entry.async("arraybuffer");
					images.push({ data, filename: name });
				}
			}
		}

		return images;
	}

	/**
	 * Render a preview image or PDF.
	 */
	private renderPreview(
		container: HTMLElement,
		preview: { data: ArrayBuffer; filename: string },
		file: TFile
	): void {
		const wrapper = container.createDiv({ cls: "pages-viewer-content" });

		// Header bar
		const header = wrapper.createDiv({ cls: "pages-viewer-header" });
		header.createSpan({
			text: file.basename,
			cls: "pages-viewer-filename",
		});
		header.createSpan({
			text: ".pages",
			cls: "pages-viewer-ext",
		});

		const mime = getMime(preview.filename);
		const blob = new Blob([preview.data], { type: mime });
		const url = URL.createObjectURL(blob);
		this.objectUrls.push(url);

		const previewArea = wrapper.createDiv({ cls: "pages-viewer-preview" });

		if (mime === "application/pdf") {
			// Render PDF in an iframe
			const iframe = previewArea.createEl("iframe", {
				cls: "pages-viewer-pdf",
			});
			iframe.src = url;
			iframe.setAttribute("frameborder", "0");
		} else {
			// Render image
			const img = previewArea.createEl("img", {
				cls: "pages-viewer-img",
			});
			img.src = url;
			img.alt = `Preview of ${file.basename}`;
		}

		// Info bar
		const info = wrapper.createDiv({ cls: "pages-viewer-info" });
		const sizeKB = (file.stat.size / 1024).toFixed(1);
		info.createSpan({
			text: `File size: ${sizeKB} KB`,
			cls: "pages-viewer-meta",
		});
		info.createSpan({
			text: `Preview source: ${preview.filename}`,
			cls: "pages-viewer-meta",
		});

		// Open in Pages button
		this.addOpenButton(wrapper, file);
	}

	/**
	 * Render embedded images when no preview is available.
	 */
	private renderEmbeddedImages(
		container: HTMLElement,
		images: { data: ArrayBuffer; filename: string }[],
		file: TFile
	): void {
		const wrapper = container.createDiv({ cls: "pages-viewer-content" });

		const header = wrapper.createDiv({ cls: "pages-viewer-header" });
		header.createSpan({
			text: file.basename,
			cls: "pages-viewer-filename",
		});
		header.createSpan({
			text: ".pages",
			cls: "pages-viewer-ext",
		});

		const notice = wrapper.createDiv({ cls: "pages-viewer-notice" });
		notice.createSpan({
			text: "No preview thumbnail found. Showing embedded images:",
		});

		const gallery = wrapper.createDiv({ cls: "pages-viewer-gallery" });

		for (const img of images) {
			const mime = getMime(img.filename);
			const blob = new Blob([img.data], { type: mime });
			const url = URL.createObjectURL(blob);
			this.objectUrls.push(url);

			const imgEl = gallery.createEl("img", {
				cls: "pages-viewer-gallery-img",
			});
			imgEl.src = url;
			imgEl.alt = img.filename;
		}

		this.addOpenButton(wrapper, file);
	}

	/**
	 * Render a fallback message when no preview or images are found.
	 */
	private renderNoPreview(
		container: HTMLElement,
		file: TFile,
		zip: JSZip
	): void {
		const wrapper = container.createDiv({ cls: "pages-viewer-content" });

		const header = wrapper.createDiv({ cls: "pages-viewer-header" });
		header.createSpan({
			text: file.basename,
			cls: "pages-viewer-filename",
		});
		header.createSpan({
			text: ".pages",
			cls: "pages-viewer-ext",
		});

		const noPreview = wrapper.createDiv({ cls: "pages-viewer-no-preview" });
		noPreview.createEl("div", {
			text: "📄",
			cls: "pages-viewer-icon",
		});
		noPreview.createEl("p", {
			text: "This .pages file does not contain an embedded preview image.",
		});
		noPreview.createEl("p", {
			text: "Open the file in Apple Pages to view its full contents.",
			cls: "pages-viewer-hint",
		});

		// Show file structure
		const details = noPreview.createEl("details", {
			cls: "pages-viewer-details",
		});
		details.createEl("summary", { text: "File structure" });
		const fileList = details.createEl("ul");
		const allFiles = Object.keys(zip.files)
			.filter((f) => !zip.files[f].dir)
			.sort();
		for (const name of allFiles) {
			fileList.createEl("li", { text: name });
		}

		this.addOpenButton(wrapper, file);
	}

	/**
	 * Render an error state.
	 */
	private renderError(
		container: HTMLElement,
		file: TFile,
		err: unknown
	): void {
		const wrapper = container.createDiv({ cls: "pages-viewer-content" });

		const errorDiv = wrapper.createDiv({ cls: "pages-viewer-error" });
		errorDiv.createEl("p", {
			text: "Failed to read .pages file",
			cls: "pages-viewer-error-title",
		});

		const message =
			err instanceof Error ? err.message : "Unknown error occurred";
		errorDiv.createEl("p", {
			text: message,
			cls: "pages-viewer-error-message",
		});

		this.addOpenButton(wrapper, file);
	}

	/**
	 * Add an "Open in Pages" button (macOS only via vault path).
	 */
	private addOpenButton(wrapper: HTMLElement, file: TFile): void {
		const actions = wrapper.createDiv({ cls: "pages-viewer-actions" });

		const openBtn = actions.createEl("button", {
			text: "Open in Apple Pages",
			cls: "pages-viewer-open-btn",
		});

		openBtn.addEventListener("click", () => {
			// Use Obsidian's vault adapter to get the full filesystem path
			const adapter = this.app.vault.adapter as any;
			if (adapter.getBasePath) {
				const basePath = adapter.getBasePath();
				const fullPath = `${basePath}/${file.path}`;
				// Open with default app (Pages on macOS)
				const { shell } = require("electron") as typeof import("electron");
				shell.openPath(fullPath);
			} else {
				new Notice(
					"Cannot determine file path. Please open the file manually in Apple Pages."
				);
			}
		});
	}
}
