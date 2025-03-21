// compare.ts
import type { AttributeInfo, ClassInfo, MethodInfo } from "./parser.ts";

export const BoxA = "Teacher";
export const BoxB = "Student";

export interface AttributeComparison {
	message: string;
	color: string;
	count?: number; // Optional count for matches
}

export interface MethodComparison {
	message: string;
	color: string;
	count?: number; // Optional count for matches
}

export interface InheritanceComparison {
	message: string;
	color: string;
}

export interface ClassComparison {
	name: string;
	type: "class";
	color: string;
	attributes: AttributeComparison[];
	methods: MethodComparison[];
	inheritance?: InheritanceComparison;
	children?: ClassComparison[];
	extends?: string;
}

const checkAttributeSignature = (attributes: AttributeInfo[]) => {
	return [
		...new Set(attributes.map((attr) => `${attr.modifier}|${attr.type}`)),
	].map((signature) => {
		const [sigMod, sigType] = signature.split("|") as [string, string];
		const count = attributes.filter(
			(attr) => attr.modifier === sigMod && attr.type === sigType,
		).length;
		return { modifier: sigMod, type: sigType, count };
	});
};

const checkMethodSignature = (methods: MethodInfo[]) => {
	return [
		...new Set(
			methods.map((method) => {
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
		return {
			modifier: sigMod,
			returnType: sigReturn,
			parameters: sigParam,
			count,
		};
	});
};

export function compareParsedClasses(
	a: ClassInfo[],
	b: ClassInfo[],
): ClassComparison[] {
	const comparisonTree: ClassComparison[] = [];
	const teacherClassNames = new Set(a.map((c) => c.name));

	for (const className of teacherClassNames) {
		const aClass = a.find((c) => c.name === className) as ClassInfo;
		const bClass = b.find((c) => c.name === className);

		const classNode: ClassComparison = {
			name: className,
			type: "class",
			color: "text-green-500",
			attributes: [],
			methods: [],
			extends: aClass.extends,
		};

		if (!bClass) {
			classNode.color = "text-red-500";
			const aAttrSignature = checkAttributeSignature(aClass.attributes);
			for (const { modifier, type, count } of aAttrSignature) {
				classNode.attributes.push({
					message: `+ ${modifier} ${type} (Count: ${count})`,
					color: "text-red-500",
					count,
				});
			}
			const aMethodSignature = checkMethodSignature(aClass.methods);
			for (const {
				modifier,
				returnType,
				parameters,
				count,
			} of aMethodSignature) {
				const tempMod = modifier !== "default" ? `${modifier} ` : "";
				classNode.methods.push({
					message: `+ ${tempMod}${returnType}(${parameters}) (Count: ${count})`,
					color: "text-red-500",
					count,
				});
			}
			comparisonTree.push(classNode);
			continue;
		}

		if (aClass.extends !== bClass.extends) {
			classNode.inheritance = {
				message: `| ${BoxA} ${aClass.extends ? `extends '${aClass.extends}'` : "didn't extend"} vs ${BoxB} ${bClass.extends ? `extends '${bClass.extends}'` : "didn't extend"}`,
				color: "text-red-500",
			};
			classNode.color = "text-red-500";
		}

		const aAttrSignature = checkAttributeSignature(aClass.attributes);
		const bAttrSignature = checkAttributeSignature(bClass.attributes);

		for (const { modifier, type, count } of aAttrSignature) {
			const matching = bAttrSignature.find(
				(attr) => attr.modifier === modifier && attr.type === type,
			);
			if (!matching) {
				classNode.attributes.push({
					message: `- ${modifier} ${type}`,
					color: "text-red-500",
				});
			} else if (matching.count < count) {
				classNode.attributes.push({
					message: `- ${modifier} ${type} (${BoxA} [${count}] x ${BoxB} [${matching.count}])`,
					color: "text-red-500",
				});
			} else if (matching.count > count) {
				classNode.attributes.push({
					message: `~ ${modifier} ${type} (${BoxA} [${count}] x ${BoxB} [${matching.count}])`,
					color: "text-yellow-500",
				});
			} else {
				classNode.attributes.push({
					message: `+ ${modifier} ${type} (Count: ${count})`,
					color: "text-green-500",
					count: count,
				});
			}
		}

		const aMethodSignature = checkMethodSignature(aClass.methods);
		const bMethodSignature = checkMethodSignature(bClass.methods);

		for (const {
			modifier,
			returnType,
			parameters,
			count,
		} of aMethodSignature) {
			const matching = bMethodSignature.find(
				(method) =>
					method.modifier === modifier &&
					method.returnType === returnType &&
					method.parameters === parameters,
			);
			const tempMod = modifier !== "default" ? `${modifier} ` : "";
			if (!matching) {
				classNode.methods.push({
					message: `- ${tempMod}${returnType}(${parameters})`,
					color: "text-red-500",
				});
			} else if (matching.count < count) {
				classNode.methods.push({
					message: `- ${tempMod}${returnType}(${parameters}) (${BoxA} [${count}] x ${BoxB} [${matching.count}])`,
					color: "text-red-500",
				});
			} else if (matching.count > count) {
				classNode.methods.push({
					message: `~ ${tempMod}${returnType}(${parameters}) (${BoxA} [${count}] x ${BoxB} [${matching.count}])`,
					color: "text-yellow-500",
				});
			} else {
				classNode.methods.push({
					message: `+ ${tempMod}${returnType}(${parameters}) (Count: ${count})`,
					color: "text-green-500",
					count: count,
				});
			}
		}

		comparisonTree.push(classNode);
	}

	return comparisonTree;
}
