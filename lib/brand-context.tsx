"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Brand } from "@/types";
import { SEED_BRANDS } from "./seed-data";

interface BrandContextType {
  brands: Brand[];
  selectedBrandId: string; // "all" or specific brand id
  selectedBrand: Brand | null;
  setSelectedBrandId: (id: string) => void;
  isLoading: boolean;
  reloadBrands: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>(SEED_BRANDS);
  const [selectedBrandId, setSelectedBrandIdState] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/brands");
      const json = await res.json();
      if (json.success && json.data) {
        setBrands(json.data);
      }
    } catch (err) {
      console.warn("Could not load brands from API, using fallback state:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
    const saved = localStorage.getItem("sentrix_selected_brand");
    if (saved) {
      setSelectedBrandIdState(saved);
    }
  }, []);

  const setSelectedBrandId = (id: string) => {
    setSelectedBrandIdState(id);
    localStorage.setItem("sentrix_selected_brand", id);
  };

  const selectedBrand =
    selectedBrandId === "all"
      ? null
      : brands.find((b) => b.id === selectedBrandId) || null;

  return (
    <BrandContext.Provider
      value={{
        brands,
        selectedBrandId,
        selectedBrand,
        setSelectedBrandId,
        isLoading,
        reloadBrands: fetchBrands,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}

