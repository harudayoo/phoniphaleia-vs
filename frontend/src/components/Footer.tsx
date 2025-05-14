import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-t from-gray-400 via-gray-200 to-transparent text-white p-1">
      <div className="container mx-auto">
        <div className="flex flex-col items-center justify-center">
          <div className="flex space-x-4 mb-2">
            {/* Facebook */}
            <a
              href="https://www.facebook.com/USePofficial/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 border border-gray-700 text-gray-700 rounded flex items-center justify-center hover:bg-gray-700 hover:text-white transition-colors duration-200"
              aria-label="Facebook"
            >
              <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-4 h-4"
              >
              <path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.406.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.312h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.406 24 22.674V1.326C24 .592 23.406 0 22.675 0"/>
              </svg>
            </a>
            {/* Twitter X */}
            <a
              href="https://x.com/usep0fficial"
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 border border-gray-700 text-gray-700 rounded flex items-center justify-center hover:bg-gray-700 hover:text-white transition-colors duration-200"
              aria-label="Twitter X"
            >
              <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-4 h-4"
              >
              <path d="M17.53 3H21.5l-7.19 8.21L23 21h-7.19l-5.66-6.48L3.5 21H-.5l7.78-8.89L1 3h7.19l5.13 5.87L17.53 3zm-2.13 15h2.13l-6.07-6.95-2.13 2.44L15.4 18zM5.41 5l6.07 6.95 2.13-2.44L8.6 5H5.41z"/>
              </svg>
            </a>
            {/* Instagram */}
            <a
              href="https://www.instagram.com/usepofficial/?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 border border-gray-700 text-gray-700 rounded flex items-center justify-center hover:bg-gray-700 hover:text-white transition-colors duration-200"
              aria-label="Instagram"
            >
              <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-4 h-4"
              >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.241 1.308 3.608.058 1.266.069 1.646.069 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.241 1.246-3.608 1.308-1.266.058-1.646.069-4.85.069s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.241-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.241-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.775.131 4.602.425 3.635 1.392 2.668 2.359 2.374 3.532 2.315 4.809 2.256 6.089 2.243 6.498 2.243 12c0 5.502.013 5.911.072 7.191.059 1.277.353 2.45 1.32 3.417.967.967 2.14 1.261 3.417 1.32 1.28.059 1.689.072 7.191.072s5.911-.013 7.191-.072c1.277-.059 2.45-.353 3.417-1.32.967-.967 1.261-2.14 1.32-3.417.059-1.28.072-1.689.072-7.191s-.013-5.911-.072-7.191c-.059-1.277-.353-2.45-1.32-3.417C21.45.425 20.277.131 19 .072 17.72.013 17.311 0 12 0zm0 5.838A6.162 6.162 0 0 0 5.838 12 6.162 6.162 0 0 0 12 18.162 6.162 6.162 0 0 0 18.162 12 6.162 6.162 0 0 0 12 5.838zm0 10.162A3.999 3.999 0 1 1 12 8a3.999 3.999 0 0 1 0 7.999zm6.406-11.845a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"/>
              </svg>
            </a>
          </div>
          <p className="text-sm text-center text-gray-700">
            © 2025 University of Southeastern Philippines. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}