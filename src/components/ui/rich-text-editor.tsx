import { Editor, EditorProps } from "react-draft-wysiwyg";
import { ControllerRenderProps } from "react-hook-form";

export function RichTextEditor({
	onChange,
	value,
	ref,
	...props
}: ControllerRenderProps &
	Omit<EditorProps, "editorState" | "onEditorStateChange" | "editorRef">) {
	return (
		<Editor
			editorState={value}
			editorRef={ref}
			onEditorStateChange={onChange}
			toolbar={{
				options: [
					"inline",
					"fontSize",
					"list",
					"colorPicker",
					"emoji",
					"history",
				],
				history: {
					undo: {
						className:
							"shadow-none hover:shadow-none bg-background border-muted py-3 px-0 aria-selected:bg-card aria-selected:boder-white rounded",
						icon: "/assets/icons/undo.svg",
					},
					redo: {
						className:
							"shadow-none hover:shadow-none bg-background border-muted py-3 px-0 aria-selected:bg-card aria-selected:boder-white rounded",
						icon: "/assets/icons/redo.svg",
					},
				},
				emoji: {
					className:
						"shadow-none hover:shadow-none bg-background border-muted py-3 px-0 aria-selected:bg-card aria-selected:boder-white rounded",
					icon: "/assets/icons/emoji.svg",
					popupClassName: "bg-card -left-28 -top-48 shadow-none rounded",
				},
				colorPicker: {
					className:
						"shadow-none hover:shadow-none bg-background border-muted py-3 px-0 aria-selected:bg-card aria-selected:boder-white rounded",
					icon: "/assets/icons/color.svg",
					popupClassName: "bg-card -left-28 -top-48 shadow-none rounded",
				},
				inline: {
					options: ["bold", "underline"],
					bold: {
						className:
							"shadow-none hover:shadow-none bg-background border-muted py-3 px-0 aria-selected:bg-card aria-selected:boder-white rounded",
						icon: "/assets/icons/bold.svg",
					},
					underline: {
						className:
							"shadow-none hover:shadow-none bg-background border-muted py-3 px-0 aria-selected:bg-card aria-selected:boder-white rounded",
						icon: "/assets/icons/underline.svg",
					},
				},
				list: {
					options: ["unordered", "ordered"],
					unordered: {
						className:
							"shadow-none hover:shadow-none bg-background border-muted py-3 px-0 aria-selected:bg-card aria-selected:boder-white rounded",
						icon: "/assets/icons/unordered.svg",
					},
					ordered: {
						className:
							"shadow-none hover:shadow-none bg-background border-muted py-3 px-0 aria-selected:bg-card aria-selected:boder-white rounded",
						icon: "/assets/icons/ordered.svg",
					},
				},
				fontSize: {
					className:
						"shadow-none hover:shadow-none border-muted rounded bg-background hover:bg-background py-3 text-sm h-6 [&>a>.rdw-dropdown-carettoclose]:border-b-white [&>a>.rdw-dropdown-carettoopen]:border-t-white [&>a>div]:top-auto",
					dropdownClassName:
						"bg-card hover:bg-card hover:[&>*]:bg-primary mt-4 [&>.rdw-dropdownoption-active]:bg-primary",
				},
			}}
			wrapperClassName="border border-muted rounded focus-within:ring-2 focus-within:ring-ring"
			toolbarClassName="bg-background border-none m-0 rounded"
			editorClassName="border-t-2 border-t-muted overflow-srroll max-h-[35vh] px-2 bg-background rounded-b"
			{...props}
		/>
	);
}
