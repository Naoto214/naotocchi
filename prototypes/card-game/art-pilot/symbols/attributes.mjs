// Pilot-only adaptations of approved-attribute-sheet.png. Motifs are approved; small-size geometry is reviewable.
export const marks={
 'ひと':['human','#E78E98','M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 14Q7 13 4 9Q2 15 11 19L12 29H15L16 22L17 29H20L21 19Q30 15 28 9Q25 13 20 14Z'],
 'けもの':['paw','#A97A50','M10 20Q16 11 22 20Q28 29 20 27Q16 25 12 27Q4 29 10 20ZM5 12a2 3 0 1 0 4 0a2 3 0 1 0-4 0M11 7a2 3 0 1 0 4 0a2 3 0 1 0-4 0M18 7a2 3 0 1 0 4 0a2 3 0 1 0-4 0M24 12a2 3 0 1 0 4 0a2 3 0 1 0-4 0'],
 'みずべ':['water','#55BFC2','M16 3C14 8 10 12 10 16A6 6 0 0 0 22 16C22 12 18 8 16 3ZM10 23C0 25 5 29 16 29C27 29 32 25 22 23M11 25Q16 27 21 25'],
 'うみ':['shell','#4D82C6','M12 26L7 20C0 13 4 9 8 9C8 4 12 3 16 4C20 3 24 4 24 9C28 9 32 13 25 20L20 26L21 29H11ZM16 24V6M13 23L9 10M19 23L23 10M11 23L5 15M21 23L27 15'],
 'むし':['beetle','#A7C94B','M12 10Q9 6 12 3M20 10Q23 6 20 3M12 12Q16 8 20 12M10 15C10 10 22 10 22 15V22C22 31 10 31 10 22ZM16 14V29M10 16L6 14L4 10M10 21H5L3 24M11 25L7 28V30M22 16L26 14L28 10M22 21H27L29 24M21 25L25 28V30'],
 'くさ':['sprout','#3EA46B','M16 29V22C16 10 5 7 3 5C3 16 9 22 16 22C16 10 27 7 29 5C29 16 23 22 16 22M16 22L7 10M16 22L25 10'],
 'げんそう':['fantasy','#916AC3','M16 3L19 13L28 16L19 19L16 29L13 19L4 16L13 13ZM5 3L6 5L8 6L6 7L5 9L4 7L2 6L4 5ZM26 3L27 5L29 6L27 7L26 9L25 7L23 6L25 5ZM6 24L7 26L6 28L5 26Z'],
 'ふしぎ':['mystery','#414B87','M21 3A13 13 0 1 0 28 24A12 12 0 0 1 21 3ZM25 10L26 13L29 14L26 15L25 18L24 15L21 14L24 13ZM29 4L30 6L29 8L28 6Z']
};
export function attributeIcon(name){const [key,color,d]=marks[name];return `<svg class="icon" data-approved-motif="${key}" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;}
