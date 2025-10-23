 const renderMarkdown = (text) => {
  let html = text;
  
  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Split by double newlines for paragraphs
  const paragraphs = html.split(/\n\n+/);
  
  html = paragraphs.map(para => {
    // Check if paragraph contains list-like items (multiple words/phrases separated by spaces or newlines)
    const items = para.split(/\n|(?=[A-Z][a-z])/).filter(Boolean);
    
    if (items.length > 3) {
      // Convert to list
      const listItems = items.map(item => `<li class="ml-4">${item.trim()}</li>`).join('');
      return `<ul class="list-disc mb-3">${listItems}</ul>`;
    }
    
    return `<p class="mb-3 leading-relaxed">${para.replace(/\n/g, '<br />')}</p>`;
  }).join('');
  
  return { __html: html };
};