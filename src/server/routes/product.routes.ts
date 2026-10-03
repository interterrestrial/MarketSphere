import { Router, type Request, type Response } from "express";
import { ok, paginated } from "../../lib/api-response";
import { asyncHandler } from "../middleware/error-handler";
import { authenticate, requireActiveAccount, requireRole } from "../middleware/require-auth";
import { validate } from "../middleware/validate";
import {
  addProductImage,
  addVariant,
  archiveProduct,
  createProduct,
  deleteProduct,
  listSellerProducts,
  publishProduct,
  removeProductImage,
  removeVariant,
  updateProduct,
  updateVariant,
} from "../services/product.service";
import {
  getVisibleProduct,
  listCategoryOptions,
  searchProducts,
} from "../services/product-search.service";
import {
  createProductSchema,
  productImageSchema,
  productSearchQuerySchema,
  updateProductSchema,
  updateVariantSchema,
  variantSchema,
} from "../validators/product";
import { paginationQuery, uuidParam } from "../validators/common";

export const productRouter = Router();

/**
 * Seller catalogue (own listings only). Accounts awaiting approval may still
 * prepare drafts — BR-02 only requires an approved account to publish, which
 * is enforced by `requireActiveAccount` on the publish route below.
 */
const sellerOnly = [authenticate, requireRole("SELLER")];
const sellerApproved = [authenticate, requireRole("SELLER"), requireActiveAccount];

// --------------------------------------------------------------------------
// Discovery — readable by any signed-in account, including sellers.
// --------------------------------------------------------------------------

/** GET /api/v1/products — keyword search, filters, sorting, pagination. */
productRouter.get(
  "/",
  authenticate,
  validate({ query: productSearchQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ReturnType<typeof productSearchQuerySchema.parse>;
    const { items, total } = await searchProducts(query);
    res.status(200).json(paginated(items, query.page, query.pageSize, total));
  })
);

/** GET /api/v1/products/categories — filter options with product counts. */
productRouter.get(
  "/categories",
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json(ok(await listCategoryOptions()));
  })
);

/** GET /api/v1/products/mine — the signed-in seller's own catalogue. */
productRouter.get(
  "/mine",
  ...sellerOnly,
  validate({ query: paginationQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const { items, total } = await listSellerProducts(req.user!, { page, pageSize });
    res.status(200).json(paginated(items, page, pageSize, total));
  })
);

/** GET /api/v1/products/:id — public product detail (MOQ, price, seller). */
productRouter.get(
  "/:id",
  authenticate,
  validate({ params: uuidParam("id") }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await getVisibleProduct(id)));
  })
);

/** POST /api/v1/products — create a draft listing. */
productRouter.post(
  "/",
  ...sellerOnly,
  validate({ body: createProductSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(ok(await createProduct(req.user!, req.body)));
  })
);

/** PATCH /api/v1/products/:id — update own listing. */
productRouter.patch(
  "/:id",
  ...sellerOnly,
  validate({ params: uuidParam("id"), body: updateProductSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await updateProduct(req.user!, id, req.body)));
  })
);

/** POST /api/v1/products/:id/publish — submit a listing for review. */
productRouter.post(
  "/:id/publish",
  ...sellerApproved,
  validate({ params: uuidParam("id") }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await publishProduct(req.user!, id)));
  })
);

/** POST /api/v1/products/:id/archive — hide a listing, keep its history. */
productRouter.post(
  "/:id/archive",
  ...sellerOnly,
  validate({ params: uuidParam("id") }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(200).json(ok(await archiveProduct(req.user!, id)));
  })
);

/** DELETE /api/v1/products/:id — deletes drafts only; else archive. */
productRouter.delete(
  "/:id",
  ...sellerOnly,
  validate({ params: uuidParam("id") }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    await deleteProduct(req.user!, id);
    res.status(200).json(ok({ deleted: true }));
  })
);

/** POST /api/v1/products/:id/images — attach an image reference. */
productRouter.post(
  "/:id/images",
  ...sellerOnly,
  validate({ params: uuidParam("id"), body: productImageSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(201).json(ok(await addProductImage(req.user!, id, req.body)));
  })
);

/** DELETE /api/v1/products/:id/images/:imageId */
productRouter.delete(
  "/:id/images/:imageId",
  ...sellerOnly,
  validate({ params: uuidParam("id").and(uuidParam("imageId")) }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, imageId } = req.params as { id: string; imageId: string };
    res.status(200).json(ok(await removeProductImage(req.user!, id, imageId)));
  })
);

/** POST /api/v1/products/:id/variants — add a size/colour/fabric option. */
productRouter.post(
  "/:id/variants",
  ...sellerOnly,
  validate({ params: uuidParam("id"), body: variantSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    res.status(201).json(ok(await addVariant(req.user!, id, req.body)));
  })
);

/** PATCH /api/v1/products/:id/variants/:variantId */
productRouter.patch(
  "/:id/variants/:variantId",
  ...sellerOnly,
  validate({ params: uuidParam("id").and(uuidParam("variantId")), body: updateVariantSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, variantId } = req.params as { id: string; variantId: string };
    res.status(200).json(ok(await updateVariant(req.user!, id, variantId, req.body)));
  })
);

/** DELETE /api/v1/products/:id/variants/:variantId */
productRouter.delete(
  "/:id/variants/:variantId",
  ...sellerOnly,
  validate({ params: uuidParam("id").and(uuidParam("variantId")) }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, variantId } = req.params as { id: string; variantId: string };
    res.status(200).json(ok(await removeVariant(req.user!, id, variantId)));
  })
);
