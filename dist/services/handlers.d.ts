import { NextResponse } from "next/server";
export declare function POST(request: Request): Promise<NextResponse<any>>;
export declare function DELETE(request: Request): Promise<NextResponse<any>>;
export declare function GET(request: Request): Promise<NextResponse<any>>;
export declare const handlers: {
    GET: typeof GET;
    POST: typeof POST;
    DELETE: typeof DELETE;
};
//# sourceMappingURL=handlers.d.ts.map