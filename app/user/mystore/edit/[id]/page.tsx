"use client";

import { use } from "react";
import ProductFormPage from "@/components/ProductFormPage";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProductFormPage editId={id} />;
}
