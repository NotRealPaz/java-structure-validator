// app.tsx
import type React from "react";
import { useState, useEffect, useRef } from "react";
import { type ClassInfo, parseJavaFile } from "./lib/parser";
import { type ClassComparison, compareParsedClasses } from "./lib/compare";

interface FileData {
	content: string;
	fileName: string;
}

const combineClasses = (files: FileData[]): ClassInfo[] => {
	return files
		.map((file) => parseJavaFile(file.content))
		.reduce((acc: ClassInfo[], result) => acc.concat(result.classes), []);
};

const DragDropBox: React.FC<{
	label: string;
	files: FileData[];
	onFilesContent: (files: FileData[]) => void;
}> = ({ label, files, onFilesContent }) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFiles = (fileList: FileList) => {
		const filesArray: FileData[] = [];
		for (const file of fileList) {
			const reader = new FileReader();
			reader.onload = (ev) => {
				const text = ev.target?.result;
				if (typeof text === "string") {
					filesArray.push({ content: text, fileName: file.name });
					if (filesArray.length === fileList.length) {
						onFilesContent(
							filesArray.sort((a, b) => a.fileName.localeCompare(b.fileName)),
						);
					}
				}
			};
			reader.readAsText(file);
		}
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			handleFiles(e.dataTransfer.files);
		}
	};

	const handleClick = () => {
		fileInputRef.current?.click();
	};

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
		<div
			className={`w-full md:w-1/2 h-40 flex flex-col justify-center items-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all duration-200 ${
				files.length > 0
					? "border-green-500 bg-green-100"
					: "border-gray-400 hover:bg-gray-100"
			}`}
			onDrop={handleDrop}
			onDragOver={(e) => e.preventDefault()}
			onClick={handleClick}
		>
			<input
				type="file"
				ref={fileInputRef}
				className="hidden"
				onChange={(e) => e.target.files && handleFiles(e.target.files)}
				accept=".java"
				multiple
			/>
			<h3 className="text-lg font-semibold text-gray-700">{label}</h3>
			{files.length > 0 ? (
				<ul className="mt-2 list-disc list-inside text-sm text-gray-600">
					{files.map((file, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						<li key={index}>{file.fileName}</li>
					))}
				</ul>
			) : (
				<p className="text-gray-500 text-sm">Drag & Drop or Click to Upload</p>
			)}
		</div>
	);
};

const ComparisonResult: React.FC<{ results: ClassComparison[] }> = ({
	results,
}) => {
	const renderComparison = (item: ClassComparison, level = 0) => {
		const indent = "│   ".repeat(level);
		const lastChildIndent = level > 0 ? "├── " : "";

		return (
			<div key={item.name} className={`font-medium ${item.color}`}>
				{`${indent}${lastChildIndent} class ${item.name}${item.extends ? ` extends ${item.extends}` : ""}`}
				{item.inheritance && (
					<span className="text-red-500">{` ${item.inheritance.message}`}</span>
				)}
				{item.attributes.length > 0 && (
					<div className="ml-4 text-sm">
						<div className="font-semibold">Attributes</div>
						{item.attributes.map((attr, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							<div key={i} className={attr.color}>
								{`${indent}├── ${attr.message}`}
							</div>
						))}
					</div>
				)}
				{item.methods.length > 0 && (
					<div className="ml-4 text-sm">
						<div className="font-semibold">Methods</div>
						{item.methods.map((method, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							<div key={i} className={method.color}>
								{`${indent}├── ${method.message}`}
							</div>
						))}
					</div>
				)}
				{item.children && item.children.length > 0 && (
					<div className="ml-4 text-sm">
						{item.children.map((child) => renderComparison(child, level + 1))}
					</div>
				)}
			</div>
		);
	};

	return (
		<code className="w-full max-w-4xl mt-6 p-4 bg-white shadow rounded-lg">
			<h2 className="text-lg font-semibold text-gray-700">Comparison Output</h2>
			{results.length === 0 ? (
				<p className="text-green-500 mt-2">
					No differences found. Files are identical.
				</p>
			) : (
				<div className="mt-2 space-y-2">
					{results.map((result) => renderComparison(result))}
				</div>
			)}
		</code>
	);
};

const App: React.FC = () => {
	const [teacherFiles, setTeacherFiles] = useState<FileData[]>([]);
	const [studentFiles, setStudentFiles] = useState<FileData[]>([]);
	const [output, setOutput] = useState<ClassComparison[]>([]);

	useEffect(() => {
		if (teacherFiles.length > 0 && studentFiles.length > 0) {
			const teacherClasses = combineClasses(teacherFiles);
			const studentClasses = combineClasses(studentFiles);
			const resultTree = compareParsedClasses(teacherClasses, studentClasses);
			setOutput(resultTree);
		}
	}, [teacherFiles, studentFiles]);

	return (
		<div className="min-h-screen flex flex-col items-center bg-gray-50 p-6">
			<h1 className="text-2xl font-bold text-gray-800 mb-6">
				Java File Comparator
			</h1>
			<div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl">
				<DragDropBox
					label="Teacher Files"
					files={teacherFiles}
					onFilesContent={setTeacherFiles}
				/>
				<DragDropBox
					label="Student Files"
					files={studentFiles}
					onFilesContent={setStudentFiles}
				/>
			</div>
			<ComparisonResult results={output} />
		</div>
	);
};

export default App;
