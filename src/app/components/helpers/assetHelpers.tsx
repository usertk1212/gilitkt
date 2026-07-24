import { Asset } from "../../utils/appwriteApi";

export const extractTags = (asset: Asset): string[] => {
  const tags: string[] = [];
  
  // Add name-based tags (simple extraction)
  // Guard against rows missing asset_name (e.g. added manually in the Appwrite
  // console without filling every field) so one incomplete row doesn't crash the app.
  const nameWords = (asset.asset_name || "").toLowerCase().split(" ");
  nameWords.forEach(word => {
    if (word.length > 2 && !tags.includes(word)) {
      tags.push(word.charAt(0).toUpperCase() + word.slice(1));
    }
  });
  
  return tags.slice(0, 3); // Limit to 3 tags
};

export const highlightSearchMatch = (text: string, query: string): React.ReactNode => {
  if (!query) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <span key={index} className="bg-blue-100 text-blue-800 font-medium">
        {part}
      </span>
    ) : part
  );
};