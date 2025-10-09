export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="relative w-full h-full">
        <div className="absolute top-0 left-0 w-full h-full border-2 border-gray-200 dark:border-gray-700 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );
}
