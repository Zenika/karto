import D3GraphLayer from './D3GraphLayer';
import { LINK_WIDTH } from './D3Constants';

export default class D3GraphLinkLayer extends D3GraphLayer {

    attachTo(linkLayersContainer) {
        this.linkSvgContainer = linkLayersContainer.append('g').attr('class', this.name);
    }

    updateElements(newElementHandler) {
        super.updateElements(newElementHandler);
        this.linkSvgContainer
            .selectAll(this.svgElement)
            .data(this.data, d => d.id)
            .join(enter => enter.append(this.svgElement)
                .call(this.svgElementAttributesApplier)
                .attr('class', 'link')
                .call(newElementHandler)
            );
    }

    updateElementsPositionAndScale(zoomFactor) {
        super.updateElementsPositionAndScale(zoomFactor);
        this.linkSvgContainer
            .selectAll(this.svgElement)
            .attr('x1', d => d.source.x || null)
            .attr('y1', d => d.source.y || null)
            .attr('x2', d => d.target.x || null)
            .attr('y2', d => d.target.y || null)
            .attr('stroke-width', LINK_WIDTH / zoomFactor);
    }
}
