import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
    const user = await getCurrentUser();

    if(!user) {
        return Response.json({
            message: "Unauthorized"
        }, {
            status: 401
        });
    }

    return Response.json({user}, {status: 200})
}