import { Controller, Get } from "@nestjs/common";
import { ResourceDto } from "./types/dto/resource.dto";
import { ResourcesService } from "./resources.service";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";


@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
    constructor(private readonly resourcesService: ResourcesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all resources', description: 'Returns all resources' })
    @ApiOkResponse({ type: ResourceDto, isArray: true, description: 'All resources' })
    async getResources(): Promise<ResourceDto[]> {
        return await this.resourcesService.getResources();
    }
}