import { Router, type Request, type Response } from "express";
import { ok } from "../../lib/api-response";
import { NotFoundError, asyncHandler } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/require-auth";
import { validate, validateDynamic } from "../middleware/validate";
import {
  createProfile,
  getOwnProfile,
  getPublicProfile,
  updateProfile,
} from "../services/business-profile.service";
import {
  createProfileSchema,
  updateProfileSchema,
  type ProfileRole,
} from "../validators/business-profile";
import { uuidParam } from "../validators/common";

export const businessProfileRouter = Router();

// Every profile operation requires a signed-in buyer or seller account.
businessProfileRouter.use(authenticate, requireRole("BUYER", "SELLER"));

function profileRole(req: Request): ProfileRole {
  return req.user!.role as ProfileRole;
}

/** GET /api/v1/business-profile — own profile + onboarding progress. */
businessProfileRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await getOwnProfile(req.user!);
    if (!result) {
      throw new NotFoundError("Business profile");
    }
    res.status(200).json(ok(result));
  })
);

/** POST /api/v1/business-profile — create this account's single profile. */
businessProfileRouter.post(
  "/",
  validateDynamic((req) => ({ body: createProfileSchema(profileRole(req)) })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await createProfile(req.user!, req.body);
    res.status(201).json(ok(result));
  })
);

/** PATCH /api/v1/business-profile — update this account's own profile. */
businessProfileRouter.patch(
  "/",
  validateDynamic((req) => ({ body: updateProfileSchema(profileRole(req)) })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await updateProfile(req.user!, req.body);
    res.status(200).json(ok(result));
  })
);

/**
 * GET /api/v1/business-profile/public/:userId — business-facing seller view.
 * Contact phone, GSTIN, street address, and PIN code are withheld.
 */
businessProfileRouter.get(
  "/public/:userId",
  validate({ params: uuidParam("userId") }),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string };
    res.status(200).json(ok(await getPublicProfile(userId)));
  })
);
