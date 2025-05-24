"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Loader4 from "@/components/Loader4";
import AdminLayout from "@/layouts/AdminLayout";
import ArrowUpScrollToTop from "@/components/ArrowUpScrollToTop";
import { FaArrowLeft, FaKey, FaLock, FaCheckCircle } from "react-icons/fa";

interface Authority {
  authority_id: number;
  authority_name: string;
}

export default function TallyElectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const election_id = searchParams?.get("election_id") || "";

  const [step, setStep] = useState<
    | "tallying"
    | "keyshares"
    | "constructing"
    | "constructed"
    | "decrypting"
    | "done"
    | "error"
  >("tallying");
  const [error, setError] = useState<string | null>(null);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [keyShares, setKeyShares] = useState<string[]>([]);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  
  // Tally votes (homomorphic tally)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Handle scroll detection for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollToTop(window.scrollY > 80);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!election_id) return;
    setStep("tallying");
    setError(null);

    console.log(`Initiating tally for election ID: ${election_id}`);

    fetch(`${API_URL}/election_results/tally`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ election_id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          // Safer error handling - try to parse JSON but fallback if it fails
          const errorText = await res.text();
          let errorMessage = "Tally failed";

          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            // If parsing fails, use the text as the error message if it exists
            errorMessage = errorText || errorMessage;
          }

          console.error("Tally failed:", errorMessage);
          throw new Error(errorMessage);
        }

        console.log("Tally succeeded, fetching authorities..."); // Fetch authorities for key shares
        return fetch(`${API_URL}/election_results/${election_id}/authorities`);
      })
      .then(async (res) => {
        if (!res.ok) {
          // Safer error handling - try to parse JSON but fallback if it fails
          const errorText = await res.text();
          let errorMessage = "Failed to fetch authorities";
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        return res.json();
      })
      .then((data) => {
        setAuthorities(data);
        setKeyShares(Array(data.length).fill(""));
        setStep("keyshares");
      })
      .catch((e) => {
        console.error("Error in tally process:", e);
        setError(e.message);
        setStep("error");
      });
  }, [election_id, API_URL]);

  // Handle key share input change
  const handleKeyShareChange = (idx: number, value: string) => {
    setKeyShares((prev) => {
      const arr = [...prev];
      arr[idx] = value;
      return arr;
    });
  };
  // Handle file upload for key share
  const handleFileUpload = (idx: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        // Extract just the key share line from the file content
        const lines = content.split("\n");
        let keyShareLine = "";

        // Look for a line that contains the key share (format: number:hex)
        for (const line of lines) {
          const trimmed = line.trim();
          // Match pattern like "1:1c8973dddb6575fe..." or just "1c8973dddb6575fe..."
          if (/^\d+:[a-fA-F0-9]+$/.test(trimmed)) {
            keyShareLine = trimmed;
            break;
          }
        }

        // If we didn't find the expected format, try to extract from "Key Share:" line
        if (!keyShareLine) {
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("Key Share:")) {
              // Check the next line
              if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                if (/^\d+:[a-fA-F0-9]+$/.test(nextLine)) {
                  keyShareLine = nextLine;
                  break;
                }
              }
            }
          }
        }

        if (keyShareLine) {
          handleKeyShareChange(idx, keyShareLine);
          console.log(`Loaded key share ${idx + 1}:`, keyShareLine);
        } else {
          console.error("Could not extract key share from file content:", content);
          setError(`Invalid key share format in file. Expected format: "number:hexadecimal"`);
        }
      }
    };
    reader.readAsText(file);
  };
  // Construct private key from key shares
  const constructPrivateKey = () => {
    setStep("constructing");
    setNotification(null);
    setError(null);

    // Validate and clean up key shares before sending
    const cleanedShares = keyShares.map((share, idx) => {
      if (!share || share.trim() === "") {
        throw new Error(`Key share ${idx + 1} is empty`);
      }

      const trimmed = share.trim();

      // Check if it matches the expected format (number:hex)
      if (!/^\d+:[a-fA-F0-9]+$/.test(trimmed)) {
        throw new Error(`Key share ${idx + 1} has invalid format. Expected: "number:hexadecimal"`);
      }

      return trimmed;
    });

    console.log("Sending cleaned key shares:", cleanedShares);

    fetch(`${API_URL}/election_results/reconstruct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ election_id, shares: cleanedShares }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          let errorMessage = "Failed to construct private key";
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        return res.json();
      })
      .then((data) => {
        setPrivateKey(data.private_key);
        setNotification("Private key successfully constructed from key shares.");
        setStep("constructed");
      })
      .catch((e) => {
        setError(e.message);
        setStep("error");
      });
  };
  // Decrypt tally
  const decryptTally = () => {
    setStep("decrypting");
    setError(null);
    fetch(`${API_URL}/election_results/decrypt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ election_id, private_key: privateKey }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          let errorMessage = "Failed to decrypt tally";
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        return res.json();
      })
      .then(() => {
        setStep("done");
        setTimeout(() => {
          router.push(`/admin/results/decrypted?election_id=${election_id}`);
        }, 1200);
      })
      .catch((e) => {
        setError(e.message);
        setStep("error");
      });
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto mt-8 space-y-6">
        {/* Header with return button */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/admin/results")}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <FaArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to Results</span>
          </button>
          <div className="text-sm text-gray-500">Election ID: {election_id}</div>
        </div>

        {/* Main content card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FaLock className="w-6 h-6" />
              Tally Election Results
            </h1>
            <p className="text-blue-100 mt-2">
              Securely compute and decrypt election results using cryptographic protocols
            </p>
          </div>

          <div className="p-8">
            {step === "tallying" && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <Loader4 size={80} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaLock className="w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-800">Computing Homomorphic Tally</h3>
                  <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                    Using Paillier cryptosystem to compute encrypted vote totals while preserving ballot privacy
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-blue-700">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}

            {step === "keyshares" && (
              <div className="space-y-6">
                <div className="text-center space-y-2 mb-8">
                  <FaKey className="w-12 h-12 text-amber-600 mx-auto" />
                  <h3 className="text-xl font-semibold text-gray-800">Key Share Collection</h3>
                  <p className="text-gray-600 max-w-lg mx-auto">
                    Enter or upload the key shares from each trusted authority to reconstruct the private key
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    constructPrivateKey();
                  }}
                  className="space-y-6"
                >
                  <div className="grid gap-6">
                    {authorities.map((auth, idx) => (
                      <div key={auth.authority_id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <label className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </div>
                          {auth.authority_name} Key Share
                        </label>
                        <div className="space-y-3">
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            value={keyShares[idx]}
                            onChange={(e) => handleKeyShareChange(idx, e.target.value)}
                            placeholder="Paste key share here (format: number:hexadecimal)"
                            required
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Or upload file:</span>
                            <input
                              type="file"
                              accept=".txt"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFileUpload(idx, e.target.files[0]);
                                }
                              }}
                              className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Construct Private Key
                  </button>
                </form>
              </div>
            )}

            {step === "constructing" && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <Loader4 size={80} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaKey className="w-8 h-8 text-amber-600 animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-800">Reconstructing Private Key</h3>
                  <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                    Using Shamir Secret Sharing to reconstruct the decryption key from authority shares
                  </p>
                </div>
              </div>
            )}

            {step === "constructed" && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <FaCheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                </div>

                {notification && (
                  <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl">
                    <div className="flex items-center justify-center gap-2">
                      <FaCheckCircle className="w-5 h-5" />
                      <span className="font-medium">{notification}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-800">Key Reconstruction Complete</h3>
                  <p className="text-gray-600">Ready to decrypt the encrypted vote tally</p>
                </div>

                <button
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl hover:from-green-700 hover:to-green-800 font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  onClick={decryptTally}
                >
                  Decrypt Tally
                </button>
              </div>
            )}

            {step === "decrypting" && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <Loader4 size={80} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaLock className="w-8 h-8 text-green-600 animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-800">Decrypting Results</h3>
                  <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                    Using the reconstructed private key to decrypt the final vote tallies
                  </p>
                </div>
              </div>
            )}

            {step === "error" && (
              <div className="text-center space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <span className="font-semibold">Error</span>
                  </div>
                  <p>{error}</p>
                </div>
                <button
                  onClick={() => router.push("/admin/results")}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Return to Results
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll to top button */}
      <ArrowUpScrollToTop show={showScrollToTop} />
    </AdminLayout>
  );
}
