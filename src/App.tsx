import type React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { type ClassInfo, parseJavaFile } from "./lib/parser";
import { compareParsedClasses } from "./lib/compare";
import "./App.css";

interface FileData {
	content: string;
	fileName: string;
}

interface DragDropBoxProps {
	label: string;
	files: FileData[];
	onFilesContent: (files: FileData[]) => void;
}

const combineClasses = (files: FileData[]): ClassInfo[] => {
	return files
		.map((file) => parseJavaFile(file.content))
		.reduce((acc: ClassInfo[], result) => acc.concat(result.classes), []);
};

const DragDropBox: React.FC<DragDropBoxProps> = ({
	label,
	files,
	onFilesContent,
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFiles = (fileList: FileList) => {
		const filesArray: FileData[] = [];
		for (const file of fileList) {
			const reader = new FileReader();
			reader.onload = (ev) => {
				const text = ev.target?.result;
				if (typeof text === "string") {
					filesArray.push({ content: text, fileName: file.name });
					// When we've read all files, call onFilesContent.
					if (filesArray.length === fileList.length) {
						// Sort the files by name to keep order consistent.
						onFilesContent(
							filesArray.sort((a, b) => a.fileName.localeCompare(b.fileName)),
						);
					}
				}
			};
			reader.readAsText(file);
		}
	};

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
				const fileList = e.dataTransfer.files;
				const filesArray: FileData[] = [];
				for (const file of fileList) {
					const reader = new FileReader();
					reader.onload = (ev) => {
						const text = ev.target?.result;
						if (typeof text === "string") {
							filesArray.push({ content: text, fileName: file.name });
							// When we've read all files, call onFilesContent.
							if (filesArray.length === fileList.length) {
								// Sort the files by name to keep order consistent.
								onFilesContent(
									filesArray.sort((a, b) =>
										a.fileName.localeCompare(b.fileName),
									),
								);
							}
						}
					};
					reader.readAsText(file);
				}
			}
		},
		[onFilesContent],
	);

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
	};

	const handleClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			handleFiles(e.target.files);
		}
	};

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
		<div
			className="drop-box"
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onClick={handleClick}
		>
			<input
				type="file"
				ref={fileInputRef}
				style={{ display: "none" }}
				onChange={handleFileChange}
				accept=".java"
				multiple
			/>
			<h3>{label}</h3>
			{files.length > 0 ? (
				<div>
					<p>Selected Files:</p>
					<ul>
						{files.map((file, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							<li key={index}>{file.fileName}</li>
						))}
					</ul>
				</div>
			) : (
				<p>
					Drag and drop your files here, or click to select one or more files
				</p>
			)}
		</div>
	);
};

const App: React.FC = () => {
	const [teacherFiles, setTeacherFiles] = useState<FileData[]>([]);
	const [studentFiles, setStudentFiles] = useState<FileData[]>([]);
	const [output, setOutput] = useState<string>("");

	// Automatically update comparison output when both boxes have files.
	useEffect(() => {
		if (teacherFiles.length > 0 && studentFiles.length > 0) {
			const teacherClasses = combineClasses(teacherFiles);
			const studentClasses = combineClasses(studentFiles);
			const result = compareParsedClasses(teacherClasses, studentClasses);
			if (result.Identical) {
				setOutput("Files are identical in structure.");
			} else {
				setOutput(result.errors.join("\n"));
			}
		}
	}, [teacherFiles, studentFiles]);

	return (
		<div className="App">
			<h1>Java File Structure Comparator</h1>
			<div className="drop-container">
				<DragDropBox
					label="Teacher"
					files={teacherFiles}
					onFilesContent={setTeacherFiles}
				/>
				<DragDropBox
					label="Student"
					files={studentFiles}
					onFilesContent={setStudentFiles}
				/>
			</div>
			<div className="output">
				<h2>Comparison Output</h2>
				<pre>{output}</pre>
			</div>
		</div>
	);
};

export default App;
