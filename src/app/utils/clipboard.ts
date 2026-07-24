// Robust clipboard utility that works across all browsers and contexts
export async function copyToClipboard(text: string): Promise<boolean> {
  let copySuccess = false;

  // Method 1: Try modern clipboard API if available and allowed
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      copySuccess = true;
      console.log("✅ Copied using Clipboard API");
      return true;
    } catch (clipboardError) {
      console.log("⚠️ Clipboard API failed, trying fallback method:", clipboardError);
      // Continue to fallback method
    }
  }

  // Method 2: Fallback using execCommand if clipboard API failed or unavailable
  if (!copySuccess) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Make the textarea invisible but still functional
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      textArea.style.zIndex = "-1";
      textArea.style.height = "1px";
      textArea.style.width = "1px";
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('contenteditable', 'true');
      
      document.body.appendChild(textArea);
      
      // Focus and select the text
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, 99999); // For mobile devices
      
      // Try to copy using the old method
      const successful = document.execCommand("copy");
      
      // Clean up
      document.body.removeChild(textArea);
      
      if (successful) {
        copySuccess = true;
        console.log("✅ Copied using execCommand");
        return true;
      } else {
        console.log("⚠️ execCommand copy returned false");
      }
    } catch (execError) {
      console.log("⚠️ execCommand copy failed:", execError);
    }
  }

  // Method 3: Try creating a temporary input element (alternative approach)
  if (!copySuccess) {
    try {
      const input = document.createElement("input");
      input.type = "text";
      input.value = text;
      input.style.position = "fixed";
      input.style.left = "-999999px";
      input.style.opacity = "0";
      
      document.body.appendChild(input);
      input.focus();
      input.select();
      
      const successful = document.execCommand("copy");
      document.body.removeChild(input);
      
      if (successful) {
        copySuccess = true;
        console.log("✅ Copied using input element");
        return true;
      }
    } catch (inputError) {
      console.log("⚠️ Input element copy failed:", inputError);
    }
  }

  console.log("❌ All copy methods failed");
  return false;
}

// Function to handle copy with user feedback
export async function copyWithFeedback(
  text: string,
  onSuccess: () => void,
  onError: (message: string) => void
): Promise<void> {
  const success = await copyToClipboard(text);
  
  if (success) {
    onSuccess();
  } else {
    // Try to select the text for manual copying
    try {
      const linkElement = document.querySelector(`a[href="${text}"]`);
      if (linkElement) {
        const range = document.createRange();
        range.selectNodeContents(linkElement);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        onError("The link text has been selected. Press Ctrl+C (or Cmd+C) to copy.");
        return;
      }
    } catch (selectionError) {
      console.log("Text selection failed:", selectionError);
    }
    
    // Final fallback: show the URL in a prompt or error message
    if (window.prompt) {
      window.prompt("Copy this URL:", text);
      onError("Please copy the URL from the dialog box.");
    } else {
      onError(`Please copy this URL manually: ${text}`);
    }
  }
}