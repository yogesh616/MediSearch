
import  React from "react"
import { useRef, useState } from "react"
import { Search, Loader2 } from "lucide-react"



export function SearchInput({
  prompt,
  setPrompt,
  isTyping = false,
  onSubmit,
  placeholder = "Type to see suggestions...",
}) {
  const inputRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && onSubmit) {
      onSubmit()
    }
  }

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl
        bg-background border border-border
        transition-all duration-300 ease-out
        ${
          isFocused
            ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20"
            : "hover:border-primary/50 shadow-sm"
        }
        ${isTyping ? "opacity-75" : ""}
      `}
    >
      {/* Search Icon */}
      <Search
        className={`w-5 h-5 flex-shrink-0 transition-colors duration-300 ${
          isFocused ? "text-primary" : "text-muted-foreground"
        }`}
      />

      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={isTyping}
        className={`
          flex-1 bg-transparent text-foreground placeholder:text-muted-foreground
          text-sm font-medium
          focus:outline-none
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-colors duration-300 border-none
        `}
      />

      {/* Loading Indicator */}
      {isTyping && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="hidden sm:inline">Processing...</span>
        </div>
      )}
    </div>
  )
}
