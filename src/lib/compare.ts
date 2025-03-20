import type { AttributeInfo, ClassInfo, MethodInfo } from "./parser.ts";

export const BoxA = "Teacher";
export const BoxB = "Student";

const checkAttributeSignature = (
	attributes: AttributeInfo[],
): [[string, string], number][] => {
	return [
		...new Set(attributes.map((attr) => `${attr.modifier}|${attr.type}`)),
	].map((signature) => {
		// Assert that split returns a tuple of [string, string]
		const [sigMod, sigType] = signature.split("|") as [string, string];
		const count = attributes.filter(
			(attr) => attr.modifier === sigMod && attr.type === sigType,
		).length;
		return [[sigMod, sigType], count];
	});
};

const checkMethodSignature = (
	methods: MethodInfo[],
): [[string, string, string], number][] => {
	return [
		...new Set(
			methods.map((method) => {
				// Create a signature ignoring the method name.
				// Signature: modifier|returnType|paramType1,paramType2,...
				const paramTypes = method.parameters
					.map((param) => param.type)
					.join(",");
				return `${method.modifier}|${method.returnType}|${paramTypes}`;
			}),
		),
	].map((signature) => {
		const [sigMod, sigReturn, sigParam] = signature.split("|") as [
			string,
			string,
			string,
		];
		const count = methods.filter((method) => {
			const paramTypes = method.parameters.map((param) => param.type).join(",");
			return (
				method.modifier === sigMod &&
				method.returnType === sigReturn &&
				paramTypes === sigParam
			);
		}).length;
		return [[sigMod, sigReturn, sigParam], count];
	});
};

export function compareParsedClasses(
	a: ClassInfo[],
	b: ClassInfo[],
): { Identical: boolean; errors: string[] } {
	const errors: string[] = [];
	const teacherClassNames = new Set(a.map((c) => c.name));

	// Check for class number mismatch.
	if (a.length !== b.length) {
		errors.push(
			`Class number mismatch ${BoxA}:[${a.length}] ${BoxB}:[${b.length}]`,
		);
	}

	// Iterate through classes in teacher result.
	for (const className of teacherClassNames) {
		const aClass = a.find((c) => c.name === className) as ClassInfo;
		const bClass = b.find((c) => c.name === className);
		if (!bClass) {
			errors.push(`Class ${className} not found in ${BoxB} result.`);
			continue;
		}

		// --- Attribute Checking ---
		const aAttributes = aClass.attributes;
		const bAttributes = bClass.attributes;
		const aAttrSignature = checkAttributeSignature(aAttributes);
		const bAttrSignature = checkAttributeSignature(bAttributes);

		if (JSON.stringify(aAttrSignature) !== JSON.stringify(bAttrSignature)) {
			errors.push(
				`Attribute mismatch for class ${className}: ${BoxA}:[${aAttributes.length}] ${BoxB}:[${bAttributes.length}]`,
			);
			for (const [sig, count] of aAttrSignature) {
				const matching = bAttrSignature.find(
					(x) => x[0][0] === sig[0] && x[0][1] === sig[1],
				);
				if (!matching) {
					errors.push(
						`Attribute '${sig[0]} ${sig[1]}' missing from class ${className} in ${BoxB} result.`,
					);
				} else if (matching[1] !== count) {
					errors.push(
						`Attribute '${sig[0]} ${sig[1]}' count mismatch for class ${className}: ${BoxA}:[${count}] ${BoxB}:[${matching[1]}]`,
					);
				}
			}
		}

		// --- Method Checking (ignoring method name) ---
		const aMethods = aClass.methods;
		const bMethods = bClass.methods;
		const aMethodSignature = checkMethodSignature(aMethods);
		const bMethodSignature = checkMethodSignature(bMethods);

		if (JSON.stringify(aMethodSignature) !== JSON.stringify(bMethodSignature)) {
			errors.push(
				`Method mismatch for class ${className}: ${BoxA}:[${aMethods.length}] ${BoxB}:[${bMethods.length}]`,
			);
			for (const [sig, count] of aMethodSignature) {
				const [mod, ret, params] = sig;
				const matching = bMethodSignature.find(
					(x) => x[0][0] === mod && x[0][1] === ret && x[0][2] === params,
				);
				if (!matching) {
					errors.push(
						`Method with signature '${mod} ${ret}(${params})' missing from class ${className} in ${BoxB} result.`,
					);
				} else if (matching[1] !== count) {
					errors.push(
						`Method with signature '${mod} ${ret}(${params})' count mismatch for class ${className}: ${BoxA}:[${count}] ${BoxB}:[${matching[1]}]`,
					);
				}
			}
		}
	}

	return { Identical: errors.length === 0, errors };
}
