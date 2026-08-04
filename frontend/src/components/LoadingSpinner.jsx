export default function LoadingSpinner({ message = "Loading..." }) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent
                        rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    );
  }