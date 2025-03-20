export interface AttributeInfo {
	modifier: "public" | "private" | "protected" | "default";
	type: string;
	name: string;
}

export interface ParameterInfo {
	type: string;
	name: string;
}

export interface MethodInfo {
	modifier: "public" | "private" | "protected" | "default";
	returnType: string;
	methodName: string;
	parameters: ParameterInfo[];
}

export interface ClassInfo {
	name: string;
	extends?: string;
	attributes: AttributeInfo[];
	methods: MethodInfo[];
}

export interface ParseResult {
	classes: ClassInfo[];
	errors: string[];
}

// --- Helper Function: Remove Comments ---
function removeComments(source: string): string {
	// Remove single-line comments.
	const withoutLineComments = source.replace(/\/\/.*$/gm, "");
	// Remove block comments.
	return withoutLineComments.replace(/\/\*[\s\S]*?\*\//g, "");
}

// --- Parsing Functions ---
function extractClassBodies(javaSource: string): {
	classes: { name: string; extendsFrom?: string; body: string }[];
} {
	const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g;
	let match: RegExpExecArray | null;
	const classes: { name: string; extendsFrom?: string; body: string }[] = [];

	// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
	while ((match = classRegex.exec(javaSource)) !== null) {
		const className = match[1] as string;
		const extendsFrom = match[2];

		const startIdx = match.index + match[0].length - 1; // Position at `{`
		let braceCount = 1;
		let endIdx = startIdx;

		// Find the matching closing brace for this class
		while (endIdx < javaSource.length && braceCount > 0) {
			endIdx++;
			if (javaSource[endIdx] === "{") braceCount++;
			if (javaSource[endIdx] === "}") braceCount--;
		}

		if (braceCount === 0) {
			const classBody = javaSource.substring(startIdx + 1, endIdx).trim();
			classes.push({ name: className, extendsFrom, body: classBody });
		} else {
			console.error(`Error: Unmatched braces in class "${className}"`);
		}
	}
	return { classes };
}

function parseJavaAttributes(classBody: string): AttributeInfo[] {
	const attributes: AttributeInfo[] = [];

	// Matches attributes inside a class: [1] modifier, [2] type, [3] name
	const attributeRegex =
		/(?:(public|private|protected)\s+)?([\w<>[\]]+)\s+(\w+)\s*;/g;
	let match: RegExpExecArray | null;

	// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
	while ((match = attributeRegex.exec(classBody)) !== null) {
		const modifier =
			(match[1] as "public" | "private" | "protected") || "default";
		const type = match[2] as string;
		const name = match[3] as string;
		if (type !== "return") attributes.push({ modifier, type, name });
	}

	return attributes;
}

function parseJavaMethods(classBody: string): MethodInfo[] {
	const methods: MethodInfo[] = [];

	// Updated regex:
	// - It now uses a positive lookahead (?=\s*\{) to ensure that the declaration is followed by an opening brace,
	//   without consuming the brace. This helps in matching multiple methods.
	// - It still expects a return type (so it won't capture constructors).
	const methodRegex =
		/(?:(public|private|protected)\s+)?([\w<>[\]]+)\s+(\w+)\s*\(([^)]*)\)(?=\s*\{)/g;
	let match: RegExpExecArray | null;

	// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
	while ((match = methodRegex.exec(classBody)) !== null) {
		const modifier =
			(match[1] as "public" | "private" | "protected") || "default";
		const returnType = match[2] as string;
		const methodName = match[3] as string;
		const paramsStr = (match[4] ?? "").trim();
		const parameters: ParameterInfo[] = [];

		if (paramsStr) {
			const params = paramsStr
				.split(",")
				.map((p) => p.trim())
				.filter((p) => p.length > 0);
			for (const param of params) {
				const parts = param.split(/\s+/);
				if (parts[0] === "final") {
					parts.shift(); // Ignore the 'final' keyword.
				}
				if (parts.length < 2) {
					// Skip invalid parameter declarations.
					continue;
				}
				const type = parts.slice(0, parts.length - 1).join(" ");
				const name = parts[parts.length - 1];
				if (type && name) parameters.push({ type, name });
			}
		}

		methods.push({ modifier, returnType, methodName, parameters });
	}

	return methods;
}

function parseJavaClasses(javaSource: string): ParseResult {
	const errors: string[] = [];
	const { classes } = extractClassBodies(javaSource);

	if (classes.length === 0) {
		errors.push("No class declarations found.");
		return { classes: [], errors };
	}

	const parsedClasses: ClassInfo[] = classes.map((classDecl) => {
		const attributes = parseJavaAttributes(classDecl.body);
		const methods = parseJavaMethods(classDecl.body);

		return {
			name: classDecl.name,
			extends: classDecl.extendsFrom,
			attributes,
			methods,
		};
	});

	return { classes: parsedClasses, errors };
}

export function parseJavaFile(source: string): ParseResult {
	try {
		// Remove all comments from the source before parsing.
		const uncommentedSource = removeComments(source);
		return parseJavaClasses(uncommentedSource);
	} catch (error) {
		return {
			classes: [],
			errors: [`Error parsing: ${error}`],
		};
	}
}
