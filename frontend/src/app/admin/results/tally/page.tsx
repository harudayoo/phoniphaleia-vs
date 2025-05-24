"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Loader4 from "@/components/Loader4";
import AdminLayout from "@/layouts/AdminLayout";

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
  const [privateKey, setPrivateKey] = useState<string | null>(null);  const [notification, setNotification] = useState<string | null>(null);
  // Tally votes (homomorphic tally)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
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
        
        console.log("Tally succeeded, fetching authorities...");// Fetch authorities for key shares
        return fetch(`${API_URL}/election_results/${election_id}/authorities`);
      }).then(async (res) => {
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
      })      .then((data) => {
        setAuthorities(data);
        setKeyShares(Array(data.length).fill(""));
        setStep("keyshares");
      })      .catch((e) => {
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
  };  // Handle file upload for key share
  const handleFileUpload = (idx: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        // Extract just the key share line from the file content
        const lines = content.split('\n');
        let keyShareLine = '';
        
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
            if (lines[i].includes('Key Share:')) {
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
          console.error('Could not extract key share from file content:', content);
          setError(`Invalid key share format in file. Expected format: "number:hexadecimal"`);
        }
      }
    };
    reader.readAsText(file);
  };  // Construct private key from key shares
  const constructPrivateKey = () => {
    setStep("constructing");
    setNotification(null);
    setError(null);
    
    // Validate and clean up key shares before sending
    const cleanedShares = keyShares.map((share, idx) => {
      if (!share || share.trim() === '') {
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
    }).then(async (res) => {
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
  };  // Decrypt tally
  const decryptTally = () => {
    setStep("decrypting");
    setError(null);
    fetch(`${API_URL}/election_results/decrypt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ election_id, private_key: privateKey }),
    }).then(async (res) => {
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
      <div className="max-w-xl mx-auto mt-10 bg-white rounded-xl shadow p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Tally Election</h2>
        {step === "tallying" && (
          <div className="flex flex-col items-center">
            <Loader4 size={60} />
            <div className="mt-4 text-gray-700 text-center">
              Homomorphically computing votes using Paillier cryptosystem...<br />
              Please wait.
            </div>
          </div>
        )}
        {step === "keyshares" && (
          <div>
            <div className="mb-4 text-gray-700 text-center">
              Enter or upload the key shares from each trusted authority below.
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                constructPrivateKey();
              }}
            >
              {authorities.map((auth, idx) => (
                <div key={auth.authority_id} className="mb-4">
                  <label className="block font-medium mb-1">
                    {auth.authority_name} Key Share
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border rounded px-3 py-2"
                      value={keyShares[idx]}
                      onChange={e => handleKeyShareChange(idx, e.target.value)}
                      placeholder="Paste key share or upload file"
                      required
                    />
                    <input
                      type="file"
                      accept=".txt"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(idx, e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                type="submit"
                className="w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800 font-semibold mt-4"
              >
                Construct Private Key
              </button>
            </form>
          </div>
        )}
        {step === "constructing" && (
          <div className="flex flex-col items-center">
            <Loader4 size={60} />
            <div className="mt-4 text-gray-700 text-center">
              Constructing private key from key shares using Shamir Secret Sharing...
            </div>
          </div>
        )}
        {step === "constructed" && (
          <div className="flex flex-col items-center">
            {notification && (
              <div className="w-full bg-green-100 text-green-800 px-4 py-2 rounded mb-4 text-center">
                {notification}
              </div>
            )}
            <button
              className="w-full bg-green-700 text-white py-2 rounded hover:bg-green-800 font-semibold"
              onClick={decryptTally}
            >
              Decrypt Tally
            </button>
          </div>
        )}
        {step === "decrypting" && (
          <div className="flex flex-col items-center">
            <Loader4 size={60} />
            <div className="mt-4 text-gray-700 text-center">
              Decrypting the encrypted tally using the constructed private key...<br />
              Please wait.
            </div>
          </div>
        )}
        {step === "error" && (
          <div className="w-full bg-red-100 text-red-800 px-4 py-2 rounded mb-4 text-center">
            {error}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
