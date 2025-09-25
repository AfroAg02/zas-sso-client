export interface Permission {
    id: number;
    name: string;
    code: string;
    description: string;
    entity: string;
    type: number;
    roleId: number;
    roleName: string;
    roleCode: string;
}
export declare function fetchMyPermissions(): Promise<Permission[]>;
export declare function checkPermission(code: string): Promise<boolean>;
//# sourceMappingURL=server.d.ts.map