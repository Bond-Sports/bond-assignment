import { ApiProperty } from "@nestjs/swagger";


export class ResourceDto {
    @ApiProperty({ example: 1, description: 'Resource ID' })
    id: number;

    @ApiProperty({ example: 'Pool', description: 'Resource name' })
    name: string;
}
