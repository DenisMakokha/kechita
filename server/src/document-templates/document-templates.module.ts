import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentTemplate } from './entities/document-template.entity';
import { DocumentTemplatesService } from './document-templates.service';
import { DocumentTemplatesController } from './document-templates.controller';
import { TemplateRendererService } from './services/template-renderer.service';
import { PdfService } from './services/pdf.service';

@Module({
    imports: [TypeOrmModule.forFeature([DocumentTemplate])],
    controllers: [DocumentTemplatesController],
    providers: [DocumentTemplatesService, TemplateRendererService, PdfService],
    exports: [DocumentTemplatesService, TemplateRendererService, PdfService],
})
export class DocumentTemplatesModule {}
