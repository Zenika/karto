import D3GraphLayer from './D3GraphLayer';
import { LINK_ARROW_DEF_ID, LINK_ARROW_FADED_DEF_ID, LINK_WIDTH } from './D3Constants';

export default class D3GraphLinkLayer extends D3GraphLayer {

    attachTo(linkLayersContainer) {
        this.linkSvgContainer = linkLayersContainer.append('g').attr('class', this.name);
    }

    updateElements(newElementAttributesApplier) {
        super.updateElements(newElementAttributesApplier);
        this.linkSvgContainer
            .selectAll(this.svgElement)
            .data(this.data, d => d.id)
            .join(this.svgElement)
            .call(this.svgElementAttributesApplier)
            .attr('class', 'link')
            .call(newElementAttributesApplier);
    }

    updateElementsPositionAndScale(zoomFactor) {
        super.updateElementsPositionAndScale(zoomFactor);
        this.linkSvgContainer
            .selectAll(this.svgElement)
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
            .attr('stroke-width', LINK_WIDTH / zoomFactor);
    }

    getLinksAsSegmentGeometries() {
        return this.data.map(link => ({
            ...link,
            x1: link.source.x,
            y1: link.source.y,
            x2: link.target.x,
            y2: link.target.y,
            layerName: this.name
        }));
    }

    applyFocus(focusPolicy) {
        super.applyFocus(focusPolicy);
        this.linkSvgContainer
            .selectAll(this.svgElement)
            .attr('class', d => focusPolicy(d) ? 'link' : 'link-faded')
            .attr('marker-end', d => focusPolicy(d)
                ? `url(#${LINK_ARROW_DEF_ID})`
                : `url(#${LINK_ARROW_FADED_DEF_ID})`);
    }
}
